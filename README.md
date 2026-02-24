# Weather Card

一个开箱即用的**静态天气卡片页面**：支持中国城市搜索、实时天气、未来 5 天预报、农历/节气展示与生活建议。项目基于原生 HTML/CSS/JavaScript 开发，无需构建步骤，可直接部署到任意静态托管平台。

## ✨ 功能特性

- 城市天气查询（默认城市：济南）
- 城市搜索支持中/英/日文输入提示
- 实时天气指标展示（温度、湿度、风速、体感、紫外线、气压、能见度等）
- 未来 5 天预报卡片（可点击切换当天详细信息）
- 公历日期 + 农历日期 + 节日/节气展示
- 基于天气数据生成今日建议与预报建议
- 完全前端实现，零后端、零数据库

## 🧱 技术栈

- **HTML5**：页面结构
- **CSS3**：卡片布局与样式
- **Vanilla JavaScript**：业务逻辑、数据请求与渲染
- **Open-Meteo API**：天气数据来源（免费、无需 API Key）

## 📁 项目结构

```text
weather-card/
├── index.html          # 页面入口
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── main.js         # UI 渲染、事件绑定、业务主逻辑
│   ├── api.js          # Open-Meteo 请求封装
│   ├── utils.js        # 天气文案、建议、格式化工具
│   ├── lunar.js        # 农历/节气相关逻辑
│   └── cities.js       # 城市经纬度数据
└── README.md
```

## 🚀 快速开始

### 方式一：直接双击打开

直接用浏览器打开 `index.html` 即可运行。

> 提示：若浏览器对本地文件访问策略较严格，建议使用方式二。

### 方式二：本地静态服务（推荐）

在项目根目录执行以下任意命令：

```bash
# Python 3
python3 -m http.server 8000

# Node.js（若已安装 serve）
npx serve .
```

然后访问：

- `http://localhost:8000`（Python）
- 或命令行输出的本地地址（serve）

## 🌐 数据来源说明

当前天气数据通过 Open-Meteo 接口获取，核心请求参数包括：

- `current`：实时天气指标
- `daily`：每日预报（最高/最低温、降水概率、风速、UV 等）
- `timezone=Asia/Shanghai`
- `forecast_days=7`

接口封装位于：`js/api.js`。

## 🛠 可自定义项

你可以按需调整：

- 默认城市（`js/main.js` 中 `currentCity`）
- 卡片文案与建议规则（`js/utils.js`）
- 页面主题样式（`css/style.css`）
- 城市数据源（`js/cities.js`）

## 📦 部署建议

该项目为纯静态资源，可直接部署到：

- GitHub Pages
- Vercel（Static）
- Netlify
- 任意 Nginx/Apache 静态站点

## ❓常见问题

### 1) 页面显示 `--` 或 “获取中”

通常是网络请求失败或接口暂时不可用。请检查：

- 当前网络是否可访问 `api.open-meteo.com`
- 浏览器控制台是否有报错

### 2) 城市搜索无结果

请确认输入城市名与内置城市数据匹配（见 `js/cities.js`）。

## 📄 License

本项目使用 MIT License（见 `LICENSE`）。
