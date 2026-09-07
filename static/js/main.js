const ALLOWED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'];

const LOADER_HTML = '<div class="predict-loader"><span class="spinner"></span>Predicting...</div>';

function validateImageFile(inputEl, errorEl) {
    const file = inputEl.files[0];
    if (!file) {
        errorEl.textContent = 'Please choose an image.';
        return false;
    }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
        errorEl.textContent = `Unsupported file type ".${ext}". Allowed: png, jpg, jpeg.`;
        return false;
    }
    errorEl.textContent = '';
    return true;
}

const colorImageInput = document.getElementById('color-image');
const colorImageError = document.getElementById('color-image-error');
colorImageInput.addEventListener('change', () => validateImageFile(colorImageInput, colorImageError));

const hairstyleImageInput = document.getElementById('hairstyle-image');
const hairstyleImageError = document.getElementById('hairstyle-image-error');
hairstyleImageInput.addEventListener('change', () => validateImageFile(hairstyleImageInput, hairstyleImageError));

document.getElementById('color-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateImageFile(colorImageInput, colorImageError)) {
        return;
    }
    const formData = new FormData(e.target);
    document.getElementById('color-display').innerHTML = LOADER_HTML;
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
    if (!validateImageFile(hairstyleImageInput, hairstyleImageError)) {
        return;
    }
    const formData = new FormData(e.target);
    document.getElementById('hairstyle-result').innerHTML = LOADER_HTML;
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
