 document.getElementById('color-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch('/predict_color', {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();

        if (result.predicted_color) {
            const rgb = `rgb(${result.predicted_color[0]}, ${result.predicted_color[1]}, ${result.predicted_color[2]})`;
            const colorBlock = `<div class="color-block" style="background-color: ${rgb};"></div>`;
            document.getElementById('color-display').innerHTML = `Color: ${rgb} ${colorBlock}`;
        } else {
            document.getElementById('color-display').innerText = 'Error: ' + result.error;
        }
    } catch (error) {
        document.getElementById('color-display').innerText = 'Error: ' + error.message;
    }
});

document.getElementById('hairstyle-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch('/predict_hairstyle', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);

            // Display the image in the predicted hairstyle block
            const hairstyleResult = document.getElementById('hairstyle-result');
            hairstyleResult.innerHTML = `
                <p>Predicted Hairstyle:</p>
                <img src="${imageUrl}" alt="Predicted Hairstyle" style="max-width: 300px;" />
            `;
        } else {
            document.getElementById('hairstyle-result').innerHTML = "<p>Error: Failed to load predicted hairstyle.</p>";
        }
    } catch (error) {
        document.getElementById('hairstyle-result').innerHTML = "<p>Error: " + error.message + "</p>";
    }
});
