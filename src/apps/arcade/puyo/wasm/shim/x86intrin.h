// x86intrin.h shim: maps the 13 SSE intrinsics ama uses onto WebAssembly SIMD128.
// Placed on the include path AHEAD of the system header so ama's own .cpp files
// compile unmodified.
#pragma once

#include <wasm_simd128.h>
#include <stdint.h>

typedef v128_t __m128i;

static inline __m128i _mm_setzero_si128(void) { return wasm_i64x2_splat(0); }

static inline __m128i _mm_set_epi16(short e7, short e6, short e5, short e4,
                                    short e3, short e2, short e1, short e0) {
    return wasm_i16x8_make(e0, e1, e2, e3, e4, e5, e6, e7);
}

static inline __m128i _mm_load_si128(const __m128i* p)  { return wasm_v128_load((const void*)p); }
static inline void    _mm_store_si128(__m128i* p, __m128i a) { wasm_v128_store((void*)p, a); }

static inline __m128i _mm_xor_si128(__m128i a, __m128i b)    { return wasm_v128_xor(a, b); }
static inline __m128i _mm_andnot_si128(__m128i a, __m128i b) { return wasm_v128_andnot(b, a); }

#define _mm_slli_epi16(a, imm) wasm_i16x8_shl((a), (imm))
#define _mm_srli_epi16(a, imm) wasm_u16x8_shr((a), (imm))

// Whole-register byte shifts. ama only ever uses imm == 2, but keep it general
// via the generic shuffle builtin (indices must be compile-time constants, so
// specialise the one case actually used and fall back to a loop otherwise).
static inline __m128i _mm_slli_si128_2(__m128i a) {
    return wasm_i8x16_shuffle(a, wasm_i64x2_splat(0),
        16, 16, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13);
}
static inline __m128i _mm_srli_si128_2(__m128i a) {
    return wasm_i8x16_shuffle(a, wasm_i64x2_splat(0),
        2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 16);
}
static inline __m128i _mm_slli_si128_n(__m128i a, int n) {
    uint8_t buf[16], out[16];
    wasm_v128_store(buf, a);
    for (int i = 0; i < 16; ++i) out[i] = (i >= n) ? buf[i - n] : 0;
    return wasm_v128_load(out);
}
static inline __m128i _mm_srli_si128_n(__m128i a, int n) {
    uint8_t buf[16], out[16];
    wasm_v128_store(buf, a);
    for (int i = 0; i < 16; ++i) out[i] = (i + n < 16) ? buf[i + n] : 0;
    return wasm_v128_load(out);
}
#define _mm_slli_si128(a, imm) ((imm) == 2 ? _mm_slli_si128_2(a) : _mm_slli_si128_n((a), (imm)))
#define _mm_srli_si128(a, imm) ((imm) == 2 ? _mm_srli_si128_2(a) : _mm_srli_si128_n((a), (imm)))

// PTEST family.
static inline int _mm_testz_si128(__m128i a, __m128i b) {
    return !wasm_v128_any_true(wasm_v128_and(a, b));
}
// _mm_testc_si128(a, b) == ((~a & b) == 0)  i.e. b is a subset of a
static inline int _mm_testc_si128(__m128i a, __m128i b) {
    return !wasm_v128_any_true(wasm_v128_andnot(b, a));
}
static inline int _mm_test_all_zeros(__m128i a, __m128i mask) {
    return _mm_testz_si128(a, mask);
}

// ---------------------------------------------------------------------------
// MSVC compatibility. ama was developed on Windows and uses a few MSVC-only
// helpers. clang does not provide them, so define them here. This header is
// reached via core/def.h before any ama header that needs them.
// ---------------------------------------------------------------------------

#ifndef _countof
#define _countof(a) (sizeof(a) / sizeof((a)[0]))
#endif
