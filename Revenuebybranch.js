document.addEventListener('DOMContentLoaded', function () {
    console.log("Document loaded and DOM fully constructed.");

    const fileInput = document.getElementById('fileInput');
    const canvas = document.getElementById('salesChart');
    const removeChartButton = document.getElementById('removeChartButton');
    let chart;

    // Load chart data from localStorage on page load
    loadChartFromStorage();

    fileInput.addEventListener('change', handleFileUpload);
    removeChartButton.addEventListener('click', removeChart);

    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Remove existing chart if there is one
        if (chart) {
            chart.destroy();
            console.log("Existing chart removed.");
        }

        // Read and parse the CSV file
        const text = await file.text();
        console.log("File content:", text);
        const data = parseCSV(text);

        if (data) {
            const { labels, salesData } = data;

            // Save parsed data to localStorage
            saveChartData(labels, salesData);

            // Display the chart if data is successfully parsed
            if (labels.length > 0 && salesData.length > 0) {
                displayChart(labels, salesData);
                canvas.style.display = 'block';
                removeChartButton.style.display = 'inline-block';
            } else {
                console.error("Parsed data is empty. Check CSV format and column indices.");
            }
        }
    }

    function parseCSV(text) {
        const rows = text.trim().split('\n');
        console.log("CSV Header:", rows[0]);

        const salesByBranch = {};

        for (let i = 1; i < rows.length; i++) { 
            const cols = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

            console.log(`Row ${i} data:`, cols);

            const location = cols[0]?.trim().replace(/"/g, ""); 
            const cumulativeSales = parseFloat(cols[11]?.replace(/"/g, ""));

            if (location && location !== "Total" && !isNaN(cumulativeSales)) {
                if (!salesByBranch[location]) {
                    salesByBranch[location] = 0;
                }
                salesByBranch[location] += cumulativeSales;
            } else {
                console.warn(`Skipping row ${i}: Invalid data format`, cols);
            }
        }

        const sortedBranches = Object.entries(salesByBranch)
            .sort((a, b) => a[1] - b[1]);

        const labels = sortedBranches.map(item => item[0]);
        const salesData = sortedBranches.map(item => item[1]);

        console.log("Parsed labels (branches):", labels);
        console.log("Parsed sales data (totals):", salesData);
        return { labels, salesData };
    }

    function displayChart(labels, data) {
        const ctx = canvas.getContext('2d');
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue by Branch ($)',
                    data: data,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Revenue by Branch',
                        font: {
                            size: 18
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Revenue: $' + context.raw.toLocaleString();
                            }
                        }
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        formatter: function(value) {
                            return '$' + value.toLocaleString();
                        },
                        color: 'black',
                        font: {
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    function removeChart() {
        if (chart) {
            chart.destroy();
            chart = null;
            console.log("Chart removed.");
            canvas.style.display = 'none';
            removeChartButton.style.display = 'none';

            // Clear chart data from localStorage
            localStorage.removeItem('chartLabels');
            localStorage.removeItem('chartData');
        }
    }

    function saveChartData(labels, data) {
        localStorage.setItem('chartLabels', JSON.stringify(labels));
        localStorage.setItem('chartData', JSON.stringify(data));
    }

    function loadChartFromStorage() {
        const labels = JSON.parse(localStorage.getItem('chartLabels'));
        const data = JSON.parse(localStorage.getItem('chartData'));

        if (labels && data) {
            displayChart(labels, data);
            canvas.style.display = 'block';
            removeChartButton.style.display = 'inline-block';
        }
    }
});
