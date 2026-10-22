// Charts for the Transactions page: a two-ring category donut and a daily income / expenses / balance trend.
// Chart.js is loaded on first use so pages without charts never download it.

let chartJsPromise;

function ensureChartJs(url) {
    if (window.Chart) {
        return Promise.resolve();
    }

    chartJsPromise ??= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = new URL(url, document.baseURI).href;
        script.onload = () => resolve();
        script.onerror = () => {
            chartJsPromise = undefined;
            reject(new Error(`Could not load Chart.js from ${url}.`));
        };
        document.head.appendChild(script);
    });

    return chartJsPromise;
}

const amountFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compactFormat = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const percentFormat = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 });

const formatAmount = value => (value < 0 ? '−' : '') + amountFormat.format(Math.abs(value));

// Colours live in app.css as --chart-* tokens (one set per theme); read them whenever the theme may have changed.
function readColors() {
    const style = getComputedStyle(document.documentElement);
    const token = name => style.getPropertyValue(name).trim();
    return {
        surface: token('--app-surface'),
        grid: token('--app-border'),
        text: token('--bs-secondary-color'),
        body: token('--bs-body-color'),
        income: [token('--chart-income-first'), token('--chart-income'), token('--chart-income-last')],
        expense: [token('--chart-expense-first'), token('--chart-expense'), token('--chart-expense-last')],
        balance: token('--chart-balance'),
    };
}

function parseHex(hex) {
    const value = parseInt(hex.replace('#', ''), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// The i-th of n shades along first → base → last, so the largest category gets the strongest step.
function shade([first, base, last], i, n) {
    if (n === 1) {
        return base;
    }

    const t = i / (n - 1);
    const [from, to, local] = t <= 0.5 ? [first, base, t * 2] : [base, last, (t - 0.5) * 2];
    const a = parseHex(from);
    const b = parseHex(to);
    return `rgb(${a.map((c, k) => Math.round(c + (b[k] - c) * local)).join(', ')})`;
}

// A 2px surface gap separates neighbouring slices; a ring with a single slice gets none, so it shows no seam.
const segmentGap = ({ dataset }) => (dataset.data.filter(value => value > 0).length > 1 ? 2 : 0);

function donutDatasets(data, colors) {
    const incomes = data.categories.filter(c => c.type === 'income');
    const expenses = data.categories.filter(c => c.type === 'expense');

    return [
        {
            // Outer ring: income categories, then expense categories, so both rings line up.
            data: data.categories.map(c => c.amount),
            labels: data.categories.map(c => c.name),
            types: data.categories.map(c => c.type),
            backgroundColor: [
                ...incomes.map((_, i) => shade(colors.income, i, incomes.length)),
                ...expenses.map((_, i) => shade(colors.expense, i, expenses.length)),
            ],
            borderColor: colors.surface,
            borderWidth: segmentGap,
            hoverOffset: 4,
            weight: 3,
        },
        {
            // Inner ring: income vs expenses.
            data: [data.totalIncome, data.totalExpenses],
            labels: ['Income', 'Expenses'],
            types: ['income', 'expense'],
            backgroundColor: [colors.income[1], colors.expense[1]],
            borderColor: colors.surface,
            borderWidth: segmentGap,
            hoverOffset: 0,
            weight: 2,
        },
    ];
}

function trendDatasets(data, colors) {
    const bar = {
        type: 'bar',
        borderRadius: { topLeft: 4, topRight: 4 },
        borderSkipped: 'start',
        maxBarThickness: 12,
        categoryPercentage: 0.8,
        barPercentage: 0.9,
        order: 2,
    };

    return [
        { ...bar, label: 'Income', data: data.days.map(d => d.income), backgroundColor: colors.income[1] },
        { ...bar, label: 'Expenses', data: data.days.map(d => d.expenses), backgroundColor: colors.expense[1] },
        {
            type: 'line',
            label: 'Balance',
            data: data.days.map(d => d.balance),
            borderColor: colors.balance,
            backgroundColor: colors.balance,
            borderWidth: 2,
            borderJoinStyle: 'round',
            borderCapStyle: 'round',
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            pointHoverBorderColor: colors.surface,
            tension: 0,
            order: 1,
            yAxisID: 'balance',
        },
    ];
}

// The bars and the balance get their own y axes, but both put zero at the same height so the bars' baseline is
// also the balance's zero line. The share of the height below zero is what the balance needs, capped at half so the
// bars always keep room.
function alignedRanges(data) {
    const extent = values => ({ below: Math.max(0, -Math.min(...values)), above: Math.max(0, ...values) });
    const bars = extent(data.days.flatMap(d => [d.income, d.expenses]));
    const balance = extent(data.days.map(d => d.balance));
    const belowShare = Math.min(0.5, balance.below / (balance.below + balance.above || 1));

    const range = ({ below, above }) => {
        const needed = Math.max(belowShare > 0 ? below / belowShare : 0, above / (1 - belowShare));
        const span = (needed || 1) * 1.1;
        return { min: -span * belowShare, max: span * (1 - belowShare) };
    };

    return { bars: range(bars), balance: range(balance) };
}

function trendScales(data, colors) {
    const ranges = alignedRanges(data);
    const valueAxis = (title, range, allowNegative) => ({
        ...range,
        border: { display: false },
        title: { display: true, text: title, color: colors.text, font: { size: 11 } },
        // The ranges are not round numbers, so leave the ends unlabelled and tick only at round steps (zero included).
        // Bars are never negative, so their axis leaves the part below zero (room for the balance) unlabelled.
        ticks: {
            color: colors.text,
            maxTicksLimit: 6,
            includeBounds: false,
            callback: value => (value < 0 && !allowNegative ? null : compactFormat.format(value)),
        },
    });

    return {
        x: {
            grid: { display: false },
            border: { color: colors.grid },
            ticks: {
                color: colors.text,
                maxRotation: 0,
                autoSkipPadding: 12,
                // Day numbers keep the axis short; the tooltip shows the full date.
                callback: (_, index) => String(index + 1),
            },
        },
        y: { ...valueAxis('Income / expenses', ranges.bars, false), position: 'left', grid: { color: colors.grid } },
        balance: { ...valueAxis('Balance', ranges.balance, true), position: 'right', grid: { drawOnChartArea: false } },
    };
}

function tooltipStyle(colors) {
    return {
        backgroundColor: colors.surface,
        titleColor: colors.body,
        bodyColor: colors.body,
        borderColor: colors.grid,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
    };
}

function createDonut(canvas, data, colors) {
    return new Chart(canvas, {
        type: 'doughnut',
        data: { datasets: donutDatasets(data, colors) },
        options: {
            maintainAspectRatio: false,
            cutout: '58%',
            animation: { duration: 300 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...tooltipStyle(colors),
                    callbacks: {
                        title: items => {
                            const { dataset, dataIndex } = items[0];
                            const kind = dataset.types[dataIndex] === 'income' ? 'income' : 'expense';
                            return items[0].datasetIndex === 0
                                ? `${dataset.labels[dataIndex]} (${kind})`
                                : dataset.labels[dataIndex];
                        },
                        label: item => {
                            const { dataset, dataIndex, datasetIndex, raw } = item;
                            const chart = item.chart;
                            const totals = chart.data.datasets[1].data;
                            if (datasetIndex === 0) {
                                const isIncome = dataset.types[dataIndex] === 'income';
                                const total = isIncome ? totals[0] : totals[1];
                                return ` ${formatAmount(raw)} · ${percentFormat.format(raw / total)} of ${isIncome ? 'income' : 'expenses'}`;
                            }

                            return ` ${formatAmount(raw)} · ${percentFormat.format(raw / (totals[0] + totals[1]))} of all activity`;
                        },
                        labelColor: item => {
                            const color = item.dataset.backgroundColor[item.dataIndex];
                            return { backgroundColor: color, borderColor: color };
                        },
                    },
                },
            },
        },
    });
}

function createTrend(canvas, data, colors) {
    return new Chart(canvas, {
        data: { labels: data.days.map(d => d.label), datasets: trendDatasets(data, colors) },
        options: {
            maintainAspectRatio: false,
            animation: { duration: 300 },
            interaction: { mode: 'index', intersect: false },
            scales: trendScales(data, colors),
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...tooltipStyle(colors),
                    // The balance line is drawn on top of the bars, but reads last: income, expenses, balance.
                    itemSort: (a, b) => a.datasetIndex - b.datasetIndex,
                    callbacks: {
                        label: item => ` ${item.dataset.label}: ${formatAmount(item.raw)}`,
                    },
                },
            },
        },
    });
}

function applyTheme(chart, colors) {
    Object.assign(chart.options.plugins.tooltip, tooltipStyle(colors));
}

export async function create(donutCanvas, trendCanvas, chartJsUrl, data) {
    await ensureChartJs(chartJsUrl);

    let colors = readColors();
    let current = data;
    const donut = createDonut(donutCanvas, data, colors);
    const trend = createTrend(trendCanvas, data, colors);

    const render = () => {
        donut.data.datasets = donutDatasets(current, colors);
        trend.data.labels = current.days.map(d => d.label);
        trend.data.datasets = trendDatasets(current, colors);
        trend.options.scales = trendScales(current, colors);
        applyTheme(donut, colors);
        applyTheme(trend, colors);
        donut.update();
        trend.update();
    };

    // The header's theme switch flips data-bs-theme on <html>; re-tint the charts to match.
    const themeObserver = new MutationObserver(() => {
        colors = readColors();
        render();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });

    return {
        update(next) {
            current = next;
            render();
        },
        destroy() {
            themeObserver.disconnect();
            donut.destroy();
            trend.destroy();
        },
    };
}
