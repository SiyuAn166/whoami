# whoami · iOS 移动端适配设计文档

> 目标仓库：[github.com/SiyuAn166/whoami](https://github.com/SiyuAn166/whoami)
> 技术栈：React 19 + TypeScript + Tailwind v3 + Vite，部署于 GitHub Pages
> 文档定位：设计标准与决策记录。只规定「做成什么样」，不规定「代码怎么写」。

## 1. 设计前提

| 约束 | 决定 |
| --- | --- |
| 数据源 | 同一套 `public/data.json`，schema 零改动 |
| 分叉方式 | 按视口断点分叉，`< 768px` 渲染 iOS shell |
| 桌面端影响 | 像素级不变，任何一步可独立回滚 |
| 保留体验 | App 图标网格、Dock |
| 移除体验 | Widget 层、锁屏、控制中心、右键菜单、窗口管理 |

一句话总结：换 shell，不改窗口。桌面层整个 `src/os/**` 一个字节都不动，移动端是并行新增的一层外壳。

## 2. 分叉策略

分叉点定在应用根组件 —— 数据加载之下、桌面根组件之上的唯一一层。这样桌面层完全不需要感知移动端的存在。

| 决策 | 结论 | 理由 |
| --- | --- | --- |
| 断点值 | 768px | 与 Tailwind `md` 对齐，避免出现第二套断点语义 |
| 监听方式 | `matchMedia` | `resize` 会在临界宽度反复触发导致 shell 抖动、状态丢失 |
| 分叉粒度 | 整个 shell 层 | 只新增文件、不改老文件，回滚成本 = 还原一行 |

三个被否决的方案：

* 窗口退化成全屏 sheet。窗口层的核心资产是拖拽、resize、z-index、traffic lights、最小化快照，在触屏上全是死代码；退化方案会让同一套状态机同时背两种语义，且窗口几何常量是围绕鼠标视口写的，改动会污染桌面端行为。
* 独立路由 `/mobile`。项目当前无 router 依赖，为一个入口引入不划算；且分享链接、旋转屏幕、桌面浏览器缩窄窗口这三种场景都要求自动切换，只有断点能同时满足。
* 服务端 UA 判断。部署在 GitHub Pages，纯静态，没有这个能力。

## 3. 复用矩阵

真正需要动笔的只有 shell 层。内容层通过给现有 `variant` prop 增加一个 `"ios"` 分支复用，数据层与主题层完全不动。

| 现有模块 | 移动端角色 | 处理方式 | 改动量 |
| --- | --- | --- | --- |
| 数据 hook | 数据源 | 原样调用，复制桌面端同样的 loading / error 守卫 | 零改动 |
| 主题 hook | 深浅色 | 原样调用，共用同一个 `localStorage` key | 零改动 |
| `styles/tokens.css` | 色彩基座 | 继续生效，另建 `ios-tokens.css` 只追加几何与材质 | 仅追加 |
| `types/portfolio.ts` | 数据契约 | 不变 | 零改动 |
| 四个 section 组件 | 四个一级 App | `variant` 联合类型 += `"ios"` | 加 variant |
| Terminal（shell / vfs / commands） | Terminal App | 与布局无关，原样挂载 | 加键盘适配 |
| Preview | Resume App | 换渲染：iframe → 下载卡片 | 换渲染 |
| 菜单栏图标（Wifi / Battery） | 状态栏图标 | 直接复用 | 零改动 |
| 菜单栏时钟 | 状态栏时间 | 逻辑复用，格式改为 `H:mm` | 改格式 |
| App 清单 registry | — | 不动，iOS 另建并行清单（图标粒度不同） | 并行清单 |
| 窗口层 `os/window/**` | — | 移动端不加载 | 不使用 |
| Widget 层 / 控制中心 / 右键菜单 / 桌面 Dock | — | 桌面专属 | 不使用 |
| Arcade | 延后 | 一期显示「桌面端体验」提示卡 | 一期不做 |

内容层复用的硬约束：

* `data.json` schema 一个字段都不加。移动端只是少渲染桌面装饰字段（`permissions` / `size` / `owner` / `session`），Gist 热更新流程与同步 workflow 都不受影响。
* 桌面分支必须走 early return 保护，`variant` 未传时行为与今天完全一致。
* 新增的 ios 渲染组件放在各 section 目录内部，不上移到 shell 层 —— 内容归内容，外壳归外壳。

## 4. 目录约定

`src/ios/` 与 `src/os/` 平级，沿用现有的 kebab-case 目录 + `index.tsx` 入口约定。

| 位置 | 职责 |
| --- | --- |
| `ios/phone/` | 根组件：数据守卫、路由、布局编排 |
| `ios/status-bar/` | 时间 + 信号 / Wifi / 电池 |
| `ios/home-screen/` | 4 列图标网格 + 分页点 + 图标按压反馈 |
| `ios/dock/` | 玻璃拟态 4 格 Dock |
| `ios/app-view/` | 全屏视图：navbar + 内容滚动 + 转场 |
| `ios/home-indicator/` | Home 条，点击或上滑回主屏 |
| `ios/springboard` | iOS App 清单（唯一 source of truth） |
| `ios/styles/ios-tokens.css` | 圆角 / 模糊 / 安全区 / iOS 系统色 |
| `apps/section/icons/` | 四个 section 图标（全项目唯一新增图标资产） |

## 5. 主屏与 Dock

照抄现有 registry 的 single source of truth 模式：加一个 App 只改清单一处，主屏与 Dock 自动跟随。

| App | 图标标签 | Navbar 标题 | 在 Dock | 内容来源 |
| --- | --- | --- | --- | --- |
| About | About | About Me | 是 | 复用 about-me section |
| Experience | Career | Experience | — | 复用 experience section |
| Projects | Projects | Projects | 是 | 复用 projects section |
| Skills | Skills | Skills | — | 复用 skills section |
| Resume | Resume | resume.pdf | 是 | `meta.resumeUrl` 下载卡片 |
| Terminal | Terminal | Terminal | 是 | 复用 terminal shell |
| Arcade | Arcade | Arcade | — | 桌面端体验提示卡 |
| Settings | Settings | Settings | — | 主题与联系方式列表 |

设计说明：

* Finder 里原本靠侧边栏切换的四个 section 在手机上提升为一级图标。手机没有侧边栏的空间预算，多一层导航就多一次流失。
* 图标标签与 navbar 标题解耦。图标下写 `Career` 避免 4 列网格换行，navbar 仍显示完整的 `Experience`。标签上限 8 字符、单行省略。
* 图标不只是入口，也是转场锚点：被点的那一个决定 App 展开的原点，所以点击回调必须把图标自身的 DOM 节点交出去。
* 分页点数量必须由实际页数算出，不能写死。当前 8 个 App 在 4 列网格里只有一页，就只显示一个点。

导航状态就是「主屏」或「某个 App」，一层栈足够 —— 没有 App Switcher，没有多窗口。必须把打开动作接进浏览器历史：Android 实体返回键和 iOS Safari 的返回手势应先退回主屏，而不是直接离开站点。这是移动端最容易被忽略、但用户最敏感的一条。

## 6. AppView 行为标准

桌面窗口有四态（normal / maximized / fullscreen / minimized）；AppView 只有两态（在场 / 不在场），职责收窄到 navbar、内容滚动、转场。

| 桌面窗口承担 | AppView 承担 |
| --- | --- |
| traffic lights 与聚焦态换色 | 44px navbar：返回 + 标题 |
| 指针拖拽 + 八向 resize | 内容区纵向滚动 + 惯性 |
| 四态状态机 | 从图标缩放展开 / 缩回 |
| 最小化快照 | large-title 收起 |
| toolbar / footer 插槽 | 左边缘右滑返回 |
| — | 软键盘 inset 与底部安全区 |

### 6.1 转场：从图标放大，不是从底部滑入

这是 iOS 手感里最关键的一条，也最容易做错。底部滑入在 iOS 里有专属语义 —— 那是 modal 或 share sheet：盖在当前上下文之上、处理完就退回的临时层。打开 App 是空间层级的推进，图标本身就是那个 App 的压缩态，点击后它原地长大成全屏。方向做反，界面立刻透出「这是网页」的味道。

| 参数 | 标准 | 说明 |
| --- | --- | --- |
| 展开原点 | 被点图标的中心 | 换算成相对舞台的百分比坐标，不需要 FLIP 或克隆节点 |
| 起始缩放 | 0.14 | ≈ 60px 图标 / 390px 屏宽，让第一帧尺寸正好等于图标本身 |
| 起始圆角 | 15px → 0 | 观感上就是那个圆角方块自己摊开 |
| 时长 | 420ms | 低端机掉帧时可降到 360ms |
| 曲线 | `cubic-bezier(0.32, 0.72, 0, 1)` | iOS 系统转场曲线 |
| 内容淡入 | 延迟 160ms | 真机上 App 内容不是跟着外框一起被拉伸的 |
| 主屏配合 | 同时放大到 1.08 并淡出压暗 | 补齐纵深感 |

三条硬规则：

* 关闭时不重置原点。保留上次的值，App 才会缩回它出发的那个图标；一重置就会缩向屏幕中心，动画方向不闭合。
* Dock 图标在舞台矩形之外，算出的纵向原点会大于 100%。这是对的：展开时从屏幕下缘长出来，与真机一致。
* 尊重 `prefers-reduced-motion`，此时转场退化为纯淡入淡出。

### 6.2 large-title 收起

iOS 进入页面时是大号粗标题排在内容流里、navbar 透明；滚过大标题后 navbar 才实心化并显示小标题。用固定滚动阈值 26px 判定即可，不需要测量标题位置。

### 6.3 左边缘右滑返回

必须跟随手指，而不是「滑一下就触发」。

| 参数 | 标准 |
| --- | --- |
| 起手区 | 左边缘 28px 内，超出不接管 |
| 放弃条件 | 纵向位移大于横向时立即放弃，避免抢内容区滚动 |
| 提交阈值 | 位移超过视口宽度 40% |
| 快甩阈值 | 260ms 内位移 60px 以上 |
| 跟手期间 | 必须关闭 transition，松手才恢复 |

最后一条是自研手势最常见的翻车点：跟手时若保留 transition，每帧 transform 都在插值，手感像隔了一层橡皮。

### 6.4 软键盘

Terminal 是唯一有输入框的 App。输入框聚焦时用 `visualViewport` 测出键盘高度，把内容区底部内边距顶起来，保证输入行与历史区都可见。

## 7. 视觉规范

颜色继续吃现有 `tokens.css`（深浅色都已就位），`ios-tokens.css` 只补 iOS 特有的几何与材质，不覆盖既有变量。

### 7.1 几何与材质

| 项 | 值 |
| --- | --- |
| 图标边长 | 60px |
| 图标圆角 | 15px（≈ 边长 × 0.25，贴近 squircle） |
| 网格列数 | 4 |
| 网格间距 | 横 14px / 纵 20px |
| 卡片圆角 | 12px |
| Navbar 高度 | 44px |
| 状态栏高度 | 46px |
| Dock 圆角 | 26px |
| 玻璃材质 | 半透明白 + `blur(22px)` + 1px 高光描边，浅色主题提高不透明度 |
| 安全区 | 一律走 `env(safe-area-inset-*)`，不写死数值 |

### 7.2 动效

| 项 | 值 |
| --- | --- |
| 系统曲线 | `cubic-bezier(0.32, 0.72, 0, 1)` |
| App 展开 | 420ms |
| 按压响应 | 100ms `ease-out` |
| 按压回弹 | 340ms |

### 7.3 排版

| 用途 | 规格 |
| --- | --- |
| App 标签 | 10.5px / 500，最多 8 字符，单行省略 |
| Navbar 标题 | 15px / 600 |
| 页面大标题 | 24px / 600，letter-spacing −0.02em |
| 正文 | 13.5px / 1.62，弱化前景色 |
| 等宽标签 | 9.5–10px，letter-spacing 0.13em，大写 |
| 字体栈 | 系统栈优先；等宽字体仅保留给 Terminal 与标签 |

### 7.4 触控与无障碍

* 触控目标与视觉尺寸解耦。Home 指示条视觉只有 112 × 4.5px、navbar 返回箭头视觉不到 20px，但命中区都必须 ≥ 44pt。做法是外扩透明命中区或用最小高度配负 margin 抵消占位，视觉不变。
* 按压反馈分两段。按下立刻响应（100ms，缩到 0.9 并压暗 22%），抬起才走 340ms 回弹。压暗要用叠加的黑色层而非降低透明度 —— iOS 是变暗不是变透明，后者会让图标渐变透出背景。
* 关掉 iOS 默认的蓝色 tap 高亮，否则点击时会闪一下方框。
* 高度一律用 `dvh` 而非 `vh`，避开 Safari 工具栏收起时的布局跳动。
* 根元素禁止整页橡皮筋，滚动只发生在 AppView 内容区。
* 图标必须是按钮语义而非可点击的 div，保证键盘与读屏可达。
* 移动端不屏蔽长按菜单。桌面端全局屏蔽 contextmenu 是刻意的，但手机上长按是选中文本、复制邮箱的唯一入口，必须在移动分支跳过。

## 8. 图标标准

硬约束：repo 里已经有两套成熟的图标资产，iOS 端一律复用同一批组件。不允许另画一套，不允许用 emoji 或字母块凑数。

### 8.1 App 图标：四个已存在，全部照搬

App 清单里每个条目的图标字段存的已经是渲染好的 element，移动端直接取用，连 import 图标组件都不需要。

| App | 源文件 | viewBox | 造型 |
| --- | --- | --- | --- |
| Finder | `apps/finder/Icon.tsx` | `0 0 512 512` | 圆角 22%，蓝→青渐变 + 白色对折脸 |
| Terminal | `apps/terminal/Icon.tsx` | `0 0 48 48` | 圆角 11，近黑底 + 三色灯 + 绿色提示符 |
| Preview | `apps/preview/Icon.tsx` | `16 16 480 480` | 内嵌纸张造型，冷白→浅蓝 + 放大镜 |
| Arcade | `apps/arcade/Icon.tsx` | `0 0 512 512` | 圆角 112，青→洋红 + 手柄 |

唯一需要新画的是四个 section 图标。About / Experience / Projects / Skills 在桌面端没有自己的图标 —— 它们是 Finder 侧边栏里的列表项，只有文字标签。第 5 章把它们提升为一级 App 后，这四个（外加 Settings）是全项目唯一必须新增的图标资产。

画法要求：沿用 15px squircle + 单色线性渐变 + 白色线性图形，与 Terminal / Arcade 的手写风格同源，不要引入第三方图标库的实心风格。

### 8.2 技能图标：25 个真实品牌 logo 已就位

技能模块已经维护了一张映射表，从 `@dev.icons/react` 精确 import 25 个组件（只 import 用到的，保证 tree-shaking），并带名字归一化（`REST_APIs` → `restapis`）。移动端必须复用这个查表函数而不是重写。

按 `data.json` 现有的 29 个技能实测：25 个命中真实 logo，4 个走 monogram 兜底。

| 分组 | 技能 → 图标组件 |
| --- | --- |
| lang | Go→`Go` · Java→`Java` · Python→`Python` · TypeScript→`TypescriptIcon` · PostgreSQL→`Postgresql` |
| infra | Kubernetes→`Kubernetes` · Docker→`DockerIcon` · Linux→`LinuxTux` · Terraform→`TerraformIcon` · AWS→`Aws` · GCP→`GoogleCloud` · Prometheus→`Prometheus` · Grafana→`Grafana` |
| dist | gRPC→`Grpc` · Kafka→`Kafka` · RabbitMQ→`Rabbitmq` · Cloudflare→`CloudflareIcon` · etcd→`Etcd` · Akamai→`Akamai` |
| frontend | React→`_React` · TailwindCSS→`TailwindIcon` · Vite→`Vite` · Vitest→`Vitest` |
| agent | Claude→`ClaudeCode` · Copilot→`GithubCopilot` |
| 兜底 | Microservices「MI」· REST_APIs「RE」· DNS「DN」· RPZ「RP」 |

那四个兜底项是概念而非产品，没有官方 logo，刻意走取前两字母的 monogram，底色由名字算出稳定色相（分别约 234° / 116° / 169° / 12°）。移动端不要给它们硬编码颜色，否则和桌面端不一致。

移动端只改尺寸，不改映射：图标从桌面的 18px 放大到 22px（手机行高更松）。分组标题、分类函数、等级条全部复用。

### 8.3 两个必须注意的细节

* SVG 渐变 id 是全局的。现有图标组件内部写死了渐变 id，Finder 图标在 iOS 上可能同时出现在主屏和 Dock，两份相同 id 进同一个 DOM 时会一律解析到第一个定义。目前两处渐变完全相同所以看不出问题，属于潜伏缺陷；真要分主题微调时必须给 id 加唯一后缀。
* `level` 字段类型不统一。frontend / agent 分组的 `level` 是字符串，其余是数字。等级条计算要求数字，渲染前必须归一，否则条长会算错。

## 9. 各 App 的移动端处理

| App | 处理 |
| --- | --- |
| About | 直接复用现有 section，走更紧的排版：单列、13.5px 正文、去掉终端风格的边框装饰。 |
| Experience | 必须重写渲染。桌面端是 `ls -l` 风格的权限 / 大小 / 时间戳表格，手机横向放不下。改为卡片列表：公司 + 时间 + 职位 + highlights，装饰性字段不渲染。 |
| Projects | 成本最低，卡片组件本来就是卡片：网格从多列降为单列，tag 换成小号 pill，点击仍打开外链。 |
| Skills | 沿用 `data.json` 的 `category` 分组，进度条高度压到 4px，等级值渲染前归一为数字。 |
| Resume | iOS Safari 不支持内嵌 PDF 滚动预览，只显示首页。换成「打开 / 下载 resume.pdf」卡片，指向同一个 `meta.resumeUrl`。 |
| Terminal | shell / vfs / commands / 补全与布局无关，原样挂载。唯一要做的是软键盘 inset。 |
| Arcade | 依赖 PixiJS + 键盘操作，手机不可玩。一期保留图标但显示「桌面端体验」提示卡，等触屏手势层做好再放开。 |
| Settings | 桌面端散在控制中心和右键菜单里的主题切换收进一个 iOS 设置列表，复用现有主题 hook 与同一个存储 key，跨端切换保持一致。同页放联系方式入口。 |

## 10. 落地阶段

每一阶段都可独立合并、独立回滚；桌面端在任何一步之后都应保持像素级不变。

| # | 阶段 | 验收标准 |
| --- | --- | --- |
| 1 | 骨架 | 窄屏能看到一块干净的「手机屏」（壁纸 + 状态栏），桌面端零变化 |
| 2 | Springboard + Dock | 主屏网格与 Dock 出来，视觉已经像 iOS，可以先给人看；点击暂不跳转 |
| 3 | AppView + 路由 | 图标缩放展开 / 缩回、navbar 返回、系统返回键接住，用占位内容验证转场手感 |
| 4 | 四个 section | About / Experience / Projects / Skills 内容全部上机，Projects 最快，Experience 需新写列表 |
| 5 | Resume + Settings | PDF 换下载卡片，Settings 接主题与联系方式 |
| 6 | Terminal | 软键盘下输入行与历史区都可用、可滚 |
| 7 | 收尾 | viewport 补 `viewport-fit=cover` 与 `theme-color`，跑一遍 format / lint / typecheck，真机过 iOS Safari 与 Android Chrome |

viewport 的两条要求：`viewport-fit=cover` 是安全区变量生效的前提；再加上 web app capable 标记，「添加到主屏幕」后能以全屏 standalone 打开 —— 一个模拟 iOS 的作品集从主屏图标启动，是这个设计最好的收尾。

## 11. 风险与坑位

| 坑 | 症状 | 处理 |
| --- | --- | --- |
| 转场方向错 | 从底部滑入，界面立刻像网页 | 必须从图标原点缩放展开；底部滑入只留给 modal |
| 关闭时重置原点 | App 缩回屏幕中心，动画方向不闭合 | 关闭只清 appId，保留原点状态 |
| 手势跟手不流畅 | 右滑返回像隔了层橡皮 | 跟手期间关闭 transition |
| 手势抢滚动 | 竖向滚内容时误触发返回 | 限左边缘 28px 起手，纵向位移占优时立即放弃 |
| 全局屏蔽 contextmenu | 手机长按无法选中文本、复制邮箱 | 移动分支跳过监听 |
| `vh` 单位 | Safari 工具栏收展时布局跳动，Dock 被裁 | 统一 `dvh`，`svh` 兜底 |
| 整页橡皮筋 | 主屏能被拽动，破坏原生错觉 | 根节点禁止 overscroll，滚动只留给 AppView |
| 触控目标过小 | Home 条 4.5px、返回箭头 20px 低于 44pt | 外扩透明命中区 |
| tap 高亮 | 点击图标闪蓝框 | 关掉默认 tap 高亮 |
| 断点抖动 | 桌面浏览器缩到临界宽度时 shell 反复切换 | 用 `matchMedia` 而非 `resize`，只在跨越时切一次 |
| 标签溢出 | 长 section 名在 4 列网格里换行 | 标签与 navbar 标题解耦 |
| SVG 渐变 id 冲突 | 同一图标出现两次时渐变解析到第一个 | 需要分主题微调时给 id 加唯一后缀 |
| `level` 类型不一致 | 部分技能等级是字符串 | 渲染前归一为数字 |
| PDF 内嵌 | iOS Safari iframe PDF 不能滚动 | 换下载卡片 |
| PixiJS 游戏 | 依赖键盘，且拖大首屏包体 | 一期占位提示，保持懒加载不进移动 bundle |
| 快照库白吃体积 | 最小化快照移动端根本用不到 | 移动路径不 import 窗口层，靠 code-split 天然剔除 |
| 分页点写死 | 只有一页却画多个点 | 点数由实际页数算出 |

## 12. 需要真机验证的项

以下几项无法在无浏览器环境里作准，必须实机过一遍：

* `dvh` 在工具栏收起 / 展开时的实际表现
* 安全区变量在刘海屏与灵动岛机型上的取值
* 左边缘右滑手势与 Safari 自带返回手势的冲突情况
* Terminal 输入框聚焦时的键盘 inset 计算
* 图标缩放展开在低端机上的帧率（必要时把展开时长降到 360ms）
