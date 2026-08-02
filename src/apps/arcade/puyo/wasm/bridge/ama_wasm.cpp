// WebAssembly bridge for ama. Exposes a single decide() entry point so the
// browser crosses the JS/WASM boundary exactly once per move.
//
// Coordinate mapping (host engine  ->  ama):
//   host grid is Cell[14][6], row 0 = vanish, row 1 = ghost, rows 2..13 playable,
//   row 13 = floor.   ama uses x 0..5, y 0..12 with y = 0 at the floor.
//   =>  ama_y = 13 - host_row      (row 13 -> 0, row 2 -> 11, row 1 -> 12)
//
// Colour mapping: the host uses ids 1..5; ama has only four playable colours
// (RED, YELLOW, GREEN, BLUE). The caller passes the palette so we can compact
// whatever subset is in play down to ama's four slots.

#include "../ama/ai/ai.h"

#include <cstring>
#include <algorithm>

extern "C" {

// Scratch buffers shared with JS. JS writes the field/queue here, then calls
// ama_decide(), then reads ama_result().
static unsigned char g_grid[14 * 6];
static unsigned char g_queue[8];      // up to 4 pairs, axis/child interleaved
static unsigned char g_palette[8];
static int           g_result[4];     // col, rot, eval, chain

unsigned char* ama_grid_ptr()    { return g_grid; }
unsigned char* ama_queue_ptr()   { return g_queue; }
unsigned char* ama_palette_ptr() { return g_palette; }
int*           ama_result_ptr()  { return g_result; }

// Tunables settable from JS.
static int g_width   = 250;
static int g_depth   = 16;
static int g_trigger = 95000;
static int g_stretch = 1;

void ama_set_params(int width, int depth, int trigger, int stretch) {
    g_width   = width;
    g_depth   = depth;
    g_trigger = trigger;
    g_stretch = stretch ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Weights, transcribed verbatim from ama's config.json "build" profile.
// ---------------------------------------------------------------------------
static beam::eval::Weight build_weight() {
    auto w = beam::eval::Weight();
    w.chain    = 1000;
    w.y        = 289;
    w.key      = -200;
    w.chi      = 200;
    w.shape    = -100;
    w.well     = -100;
    w.bump     = -100;
    w.form     = 50;
    w.link_2   = 150;
    w.link_3   = 250;
    w.waste_14 = -50;
    w.side     = 0;
    w.nuisance = 0;
    w.tear     = -250;
    w.waste    = -250;
    return w;
}


// ---------------------------------------------------------------------------
// Serial replacement for beam::search_multi.
//
// ama's search_multi() unconditionally spawns beam::BRANCH std::threads. In a
// build without -pthread that constructor aborts at runtime, which is exactly
// the Aborted() seen in the browser. This reimplements the same algorithm with
// a plain loop so the single-thread artefact works. Logic is copied from
// beam.cpp: build BRANCH queues, run beam::search on each, accumulate the per
// placement scores, then sort with the same comparator.
// ---------------------------------------------------------------------------
static beam::Result search_multi_serial(
    Field field,
    cell::Queue queue,
    beam::eval::Weight w,
    beam::Configs configs
) {
    auto result = beam::Result();

    for (size_t i = 0; i < beam::BRANCH; ++i) {
        auto q = queue;
        auto qrng = beam::get_queue_random(
            static_cast<i32>(i),
            configs.depth > queue.size() ? configs.depth - queue.size() : 0
        );
        q.insert(q.end(), qrng.begin(), qrng.end());

        auto b = beam::search(field, q, w, configs);

        if (b.candidates.empty()) {
            continue;
        }

        if (result.candidates.empty()) {
            result = b;
            continue;
        }

        for (auto& c1 : result.candidates) {
            for (auto& c2 : b.candidates) {
                if (c1.placement == c2.placement) {
                    c1.score += c2.score;
                    break;
                }
            }
        }
    }

    return result;
}

// ---------------------------------------------------------------------------
static inline cell::Type map_colour(unsigned char host_id, int palette_len) {
    for (int i = 0; i < palette_len && i < 4; ++i) {
        if (g_palette[i] == host_id) {
            return static_cast<cell::Type>(i);   // RED, YELLOW, GREEN, BLUE
        }
    }
    return cell::Type::GARBAGE;
}

// queue_len = number of pairs available in g_queue (1..4)
int ama_decide(int queue_len, int palette_len) {
    auto field = Field();

    for (int row = 1; row <= 13; ++row) {
        int y = 13 - row;
        for (int x = 0; x < 6; ++x) {
            unsigned char v = g_grid[row * 6 + x];
            if (v == 0) continue;
            field.set_cell(static_cast<i8>(x), static_cast<i8>(y),
                           map_colour(v, palette_len));
        }
    }

    auto queue = cell::Queue();
    for (int i = 0; i < queue_len && i < 4; ++i) {
        queue.push_back({
            map_colour(g_queue[i * 2],     palette_len),
            map_colour(g_queue[i * 2 + 1], palette_len)
        });
    }
    if (queue.empty()) {
        g_result[0] = 2; g_result[1] = 0; g_result[2] = 0; g_result[3] = 0;
        return 0;
    }

    auto beam_cfg    = beam::Configs();
    beam_cfg.width   = static_cast<size_t>(g_width);
    beam_cfg.depth   = static_cast<size_t>(g_depth);
    beam_cfg.trigger = static_cast<size_t>(g_trigger);
    beam_cfg.stretch = g_stretch != 0;

    auto weight = build_weight();

    // Two visible pairs means queue.size() <= 2, which is exactly the
    // multi-queue path ama uses when the future is unknown.
#ifdef AMA_NO_THREADS
    auto result = (queue.size() > 2)
        ? beam::search(field, queue, weight, beam_cfg)
        : search_multi_serial(field, queue, weight, beam_cfg);
#else
    auto result = (queue.size() > 2)
        ? beam::search(field, queue, weight, beam_cfg)
        : beam::search_multi(field, queue, weight, beam_cfg);
#endif

    if (result.candidates.empty()) {
        g_result[0] = 2; g_result[1] = 0; g_result[2] = 0; g_result[3] = 0;
        return 0;
    }

    std::sort(
        result.candidates.begin(),
        result.candidates.end(),
        [&] (const beam::Candidate& a, const beam::Candidate& b) {
            if (beam_cfg.stretch) {
                return a.score > b.score;
            }
            bool a_enough = a.score / beam::BRANCH >= beam_cfg.trigger;
            bool b_enough = b.score / beam::BRANCH >= beam_cfg.trigger;
            if (a_enough && b_enough) {
                return a.score < b.score;
            }
            return a.score > b.score;
        }
    );

    const auto& best = result.candidates.front();
    g_result[0] = static_cast<int>(best.placement.x);
    g_result[1] = static_cast<int>(best.placement.r);
    g_result[2] = static_cast<int>(best.score / beam::BRANCH);
    g_result[3] = 0;
    return 1;
}

} // extern "C"
