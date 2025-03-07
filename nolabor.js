document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csvData = e.target.result;
        Papa.parse(csvData, {
            complete: function(results) {
                displayTable(results.data);
            }
        });
    };
    reader.readAsText(file);
});

function displayTable(data) {
    const table = document.getElementById('csvTable');
    table.innerHTML = '';
    
    data.forEach((row, rowIndex) => {
        if (row.every(cell => cell === "" || cell === null || cell === undefined)) return; // Hide empty rows
        
        const tr = document.createElement('tr');
        row.forEach((cell, colIndex) => {
            if (![2, 5, 9, 12].includes(colIndex)) { // Hides 3rd, 6th, 10th, and 13th columns
                const cellElement = rowIndex === 0 && colIndex === 2 ? document.createElement('th') : document.createElement('td');
                if (!(rowIndex === 0 && colIndex === 2) && cell !== "Raleigh,Charleston,Charlotte,Wilmington,Greensboro,Myrtle Beach,Columbia,Greenville,Savannah,Atlanta,Richmond") { // Hide content of column 3 row 1
                    cellElement.textContent = cell;
                }
                tr.appendChild(cellElement);
            }
        });
        table.appendChild(tr);
    });
}