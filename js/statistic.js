/* global Plotly */
import { CATEGORY_COLORS } from "./config.js";
import { metricsData } from "./report.js";

/**
 * [新增] 核心統計與繪圖進入點
 * 將原本散落在 network.js 的邏輯集中管理，便於未來擴充其他圖表 (如盒鬚圖)
 * @param {number} index 群組索引
 * @param {Array} members 該群組的成員名單 (姓名字串陣列)
 */
export function renderClusterAnalysis(index, members) {
    // 1. 篩選出該群組成員的資料
    const groupMetrics = metricsData.filter((d) =>
        members.includes(d.Person_Name),
    );

    if (!groupMetrics.length) return;

    // 2. 執行各項圖表渲染
    renderCategoryPieChart(index, groupMetrics);

    // 盒鬚圖：貼文數、粉絲數、追蹤數
    renderPostsBoxPlot(index, groupMetrics);
    renderFollowersBoxPlot(index, groupMetrics);
    renderFollowingBoxPlot(index, groupMetrics);
}

/**
 * [原本的邏輯] 繪製類別圓餅圖與 Top 5 表格
 */
function renderCategoryPieChart(index, groupMetrics) {
    // 統計類別 (處理 "類別1,類別2" 的情況)
    const catCounts = {};
    groupMetrics.forEach((d) => {
        const cats = String(d.category || "未分類")
            .split(",")
            .map((c) => c.trim());
        cats.forEach((c) => {
            if (c) catCounts[c] = (catCounts[c] || 0) + 1;
        });
    });

    // 格式化數據
    const total = Object.values(catCounts).reduce((a, b) => a + b, 0);
    const sortedCats = Object.entries(catCounts)
        .sort((a, b) => b[1] - a[1]) // 依照數量由高到低
        .map(([name, count]) => ({
            name,
            count,
            percentage: ((count / total) * 100).toFixed(1),
        }));

    // 繪製 Plotly 圓餅圖
    const plotData = [
        {
            values: sortedCats.map((d) => d.count),
            labels: sortedCats.map((d) => d.name),
            type: "pie",
            hole: 0.4,
            marker: {
                colors: sortedCats.map(
                    (d) =>
                        CATEGORY_COLORS[d.name] || CATEGORY_COLORS["default"],
                ),
            },
            textinfo: "label",
            hoverinfo: "label+value+percent",
            automargin: true,
        },
    ];

    const layout = {
        showlegend: false,
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#cbd5e1", size: 10 },
        margin: { t: 10, b: 10, l: 10, r: 10 },
        height: 250,
    };

    Plotly.newPlot(`chart-${index}`, plotData, layout, {
        displayModeBar: false,
    });

    // 渲染 Top 5 表格
    const top5Html = `
        <table class="w-full text-[10px] text-left">
            <thead>
                <tr class="text-slate-500 border-b border-slate-700">
                    <th class="pb-1">排名</th>
                    <th class="pb-1">類別</th>
                    <th class="pb-1 text-right">占比</th>
                </tr>
            </thead>
            <tbody>
                ${sortedCats
                    .slice(0, 5)
                    .map(
                        (d, i) => `
                    <tr class="border-b border-slate-700/50">
                        <td class="py-1">${i + 1}</td>
                        <td class="py-1 text-blue-300">${d.name} (${d.count})</td>
                        <td class="py-1 text-right text-slate-400">${d.percentage}%</td>
                    </tr>
                `,
                    )
                    .join("")}
            </tbody>
        </table>
    `;
    const top5Container = document.getElementById(`top5-${index}`);
    if (top5Container) top5Container.innerHTML = top5Html;
}

/**
 * [新增] 繪製貼文數 (posts) 盒鬚圖
 */
function renderPostsBoxPlot(index, groupMetrics) {
    const data = groupMetrics.map((d) => d.posts || 0);
    drawBoxPlot(`posts-chart-${index}`, data, "貼文數分布 (Posts)", "#60a5fa");
}

/**
 * [新增] 繪製粉絲數 (Followers) 盒鬚圖
 */
function renderFollowersBoxPlot(index, groupMetrics) {
    const data = groupMetrics.map((d) => d.Followers || 0);
    drawBoxPlot(
        `followers-chart-${index}`,
        data,
        "粉絲數分布 (Followers)",
        "#fbbf24",
    );
}

/**
 * [新增] 繪製追蹤數 (Following) 盒鬚圖
 */
function renderFollowingBoxPlot(index, groupMetrics) {
    const data = groupMetrics.map((d) => d.Following || 0);
    drawBoxPlot(
        `following-chart-${index}`,
        data,
        "追蹤數分布 (Following)",
        "#34d399",
    );
}

/**
 * 內部共用繪圖工具：產生盒鬚圖
 */
function drawBoxPlot(elementId, values, title, color) {
    const trace = {
        y: values,
        type: "box",
        name: "",
        boxpoints: "all", // 顯示所有點
        jitter: 0.3, // 散佈點的隨機程度
        pointpos: -1.8, // 散佈點相對於盒子的位置
        marker: { size: 3, color: color, opacity: 0.6 },
        line: { width: 1.5, color: color },
        fillcolor: color + "20", // 增加透明背景
    };

    const layout = {
        title: { text: title, font: { size: 12, color: color }, x: 0.05 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#94a3b8", size: 10 },
        margin: { t: 40, b: 20, l: 40, r: 10 },
        height: 180,
        yaxis: {
            gridcolor: "rgba(255,255,255,0.05)",
            zerolinecolor: "rgba(255,255,255,0.1)",
        },
        xaxis: { showticklabels: false },
    };

    Plotly.newPlot(elementId, [trace], layout, { displayModeBar: false });
}

/**
 * [新增] 渲染橫向分群比較視圖
 */
export function renderClusterComparisonView() {
    const container = document.getElementById("tab-cluster");
    if (!container) return;

    // 從全域獲取 communityData (現在 window.getCommunityData 已定義)
    const rawCommunityData = window.getCommunityData
        ? window.getCommunityData()
        : [];

    // 排除 0-Degree 群組
    const validCommunities = rawCommunityData.filter(
        (c) => c.name !== "0-Degree",
    );

    // 構建橫向 flex 結構
    // 左側固定標籤欄 (Sticky Labels) + 右側可滾動內容
    let html = `
        <div class="flex flex-row overflow-x-auto min-w-full p-6 gap-6 h-full">
            <div class="flex flex-col gap-6 sticky left-0 z-20 bg-slate-900/90 p-4 backdrop-blur-md border-r border-slate-700 w-28 shrink-0 shadow-xl">
                <div class="h-10"></div> <div class="h-[250px] flex items-center justify-center font-bold text-slate-500 border-b border-slate-700/50 text-xs">類別佔比</div>
                <div class="h-[180px] flex items-center justify-center font-bold text-slate-500 border-b border-slate-700/50 text-xs">貼文分佈</div>
                <div class="h-[180px] flex items-center justify-center font-bold text-slate-500 border-b border-slate-700/50 text-xs">粉絲分佈</div>
                <div class="h-[180px] flex items-center justify-center font-bold text-slate-500 text-xs">追蹤分佈</div>
            </div>
    `;

    validCommunities.forEach((comm, idx) => {
        html += `
            <div class="flex flex-col gap-6 min-w-[320px] bg-slate-800/40 rounded-2xl p-6 border border-slate-700/50 hover:border-blue-500/30 transition-all">
                <div class="text-center py-2 bg-blue-500/20 rounded-lg text-blue-400 font-black border border-blue-500/30">
                    Group ${comm.name} <span class="text-xs font-normal text-slate-500 ml-1">(${comm.count}人)</span>
                </div>
                <div id="comp-pie-${idx}" class="h-[250px]"></div>
                <div id="comp-posts-${idx}" class="h-[180px]"></div>
                <div id="comp-followers-${idx}" class="h-[180px]"></div>
                <div id="comp-following-${idx}" class="h-[180px]"></div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;

    // 渲染各群組圖表
    validCommunities.forEach((comm, idx) => {
        const groupMetrics = metricsData.filter((d) =>
            comm.members.includes(d.Person_Name),
        );
        if (groupMetrics.length > 0) {
            drawComparisonCharts(idx, groupMetrics);
        }
    });
}

/**
 * 比較分頁專用的繪圖函式，複用原本的 drawBoxPlot
 */
function drawComparisonCharts(idx, groupMetrics) {
    // 1. 類別圓餅圖
    const catCounts = {};
    groupMetrics.forEach((d) => {
        const cats = String(d.category || "未分類")
            .split(",")
            .map((c) => c.trim());
        cats.forEach((c) => {
            if (c) catCounts[c] = (catCounts[c] || 0) + 1;
        });
    });
    const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);

    Plotly.newPlot(
        `comp-pie-${idx}`,
        [
            {
                values: sortedCats.map((d) => d[1]),
                labels: sortedCats.map((d) => d[0]),
                type: "pie",
                hole: 0.5,
                marker: {
                    colors: sortedCats.map(
                        (d) =>
                            CATEGORY_COLORS[d[0]] || CATEGORY_COLORS["default"],
                    ),
                },
                textinfo: "none",
                hoverinfo: "label+value+percent",
                automargin: true,
            },
        ],
        {
            showlegend: false,
            paper_bgcolor: "rgba(0,0,0,0)",
            margin: { t: 5, b: 5, l: 5, r: 5 },
            height: 250,
        },
        { displayModeBar: false },
    );

    // 2. 複用原有的 drawBoxPlot (傳入對應 ID)
    // 注意：這裡直接調用你在 statistic.js 原有的 drawBoxPlot 函式
    const postsData = groupMetrics.map((d) => d.posts || 0);
    const followersData = groupMetrics.map((d) => d.Followers || 0);
    const followingData = groupMetrics.map((d) => d.Following || 0);

    drawBoxPlot(`comp-posts-${idx}`, postsData, "", "#60a5fa");
    drawBoxPlot(`comp-followers-${idx}`, followersData, "", "#fbbf24");
    drawBoxPlot(`comp-following-${idx}`, followingData, "", "#34d399");
}

// 曝露給全域
window.renderClusterComparisonView = renderClusterComparisonView;
