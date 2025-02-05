// Function to disable context menu prevention
function disableContextMenuPrevention() {
  // Override preventDefault
  const originalPreventDefault = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function() {
    if (this.type === 'contextmenu') {
      return;
    }
    return originalPreventDefault.apply(this, arguments);
  };

  // Remove all contextmenu event listeners
  window.addEventListener('load', function() {
    document.addEventListener('contextmenu', function(e) {
      e.stopImmediatePropagation();
    }, true);
  });

  // Periodically remove any dynamically added event listeners
  setInterval(() => {
    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
      element.oncontextmenu = null;
    });
  }, 1000);
}

// Execute the function immediately
disableContextMenuPrevention();

// Create sidebar if it doesn't exist
function createSidebar() {
  let existingSidebar = document.getElementById('image-reader-sidebar');
  if (existingSidebar) {
    return existingSidebar;
  }

  let sidebar = document.createElement('div');
  sidebar.id = 'image-reader-sidebar';
  sidebar.style.display = 'none';
  document.body.appendChild(sidebar);
  return sidebar;
}

// Track if we're currently loading a description
let isLoadingDescription = false;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message); // Debug log

  if (message.type === "SHOW_IMAGE_INFO" && !isLoadingDescription) {
    isLoadingDescription = true;
    const imageUrl = message.imageUrl;
    console.log('Image URL:', imageUrl); // Debug log
    
    // Create image element
    const img = new Image();
    img.crossOrigin = "anonymous"; // Try to handle CORS
    img.src = imageUrl;
    
    img.onload = async function() {
      console.log('Image loaded:', this.width, this.height); // Debug log
      
      // Get or create sidebar
      const sidebar = createSidebar();
      
      // Show loading state first
      sidebar.innerHTML = `
        <div class="sidebar-header">
          <h2 style="color: #333; margin: 0 0 10px 0;">Image Info</h2>
          <button class="close-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #333;">&times;</button>
        </div>
        <div class="image-container">
          <img src="${imageUrl}" alt="Selected image" style="max-width: 100%; height: auto; margin-bottom: 15px; border: 1px solid #eee;">
        </div>
        <div class="image-info" style="color: #333; font-size: 14px;">
          <p style="margin: 8px 0;"><strong style="color: #000;">Width:</strong> ${this.width}px</p>
          <p style="margin: 8px 0;"><strong style="color: #000;">Height:</strong> ${this.height}px</p>
          <p style="margin: 8px 0;"><strong style="color: #000;">URL:</strong> <a href="${imageUrl}" target="_blank" style="color: #0066cc; text-decoration: none;">Open in new tab</a></p>
          <div id="gpt-description" style="margin-top: 15px;">
            <strong style="color: #000;">Description:</strong>
            <p style="margin: 8px 0;">Loading description...</p>
          </div>
        </div>
      `;
      
      // Force sidebar to be visible and properly positioned
      sidebar.style.display = 'block';
      sidebar.style.position = 'fixed';
      sidebar.style.top = '0';
      sidebar.style.right = '0';
      sidebar.style.width = '300px';
      sidebar.style.height = '100vh';
      sidebar.style.backgroundColor = 'white';
      sidebar.style.boxShadow = '-2px 0 5px rgba(0,0,0,0.2)';
      sidebar.style.zIndex = '999999';
      sidebar.style.padding = '20px';
      sidebar.style.boxSizing = 'border-box';
      sidebar.style.overflowY = 'auto';
      
      // Add close button functionality
      const closeBtn = sidebar.querySelector('.close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          sidebar.style.display = 'none';
        });
      }

      // Get GPT description
      try {
        const description = await getGPTDescription(imageUrl);
        const gptDescription = document.getElementById('gpt-description');
        if (gptDescription) {
          gptDescription.innerHTML = `
            <strong style="color: #000;">GPT Description:</strong>
            <p style="margin: 8px 0;">${description}</p>
          `;
        }
      } catch (error) {
        console.error('Error getting description:', error);
        const gptDescription = document.getElementById('gpt-description');
        if (gptDescription) {
          gptDescription.innerHTML = `
            <strong style="color: #000;">GPT Description:</strong>
            <p style="margin: 8px 0; color: red;">Error: ${error.message}</p>
          `;
        }
      } finally {
        isLoadingDescription = false;
      }
    };

    img.onerror = function(error) {
      console.error('Error loading image:', error);
      sidebar.innerHTML = `
        <div class="sidebar-header">
          <h2 style="color: #333; margin: 0 0 10px 0;">Image Information</h2>
          <button class="close-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #333;">&times;</button>
        </div>
        <div class="image-info" style="color: #333; font-size: 14px;">
          <p style="margin: 8px 0;">Error loading image. This might be due to CORS restrictions.</p>
          <p style="margin: 8px 0;"><strong style="color: #000;">URL:</strong> <a href="${imageUrl}" target="_blank" style="color: #0066cc; text-decoration: none;">Open in new tab</a></p>
        </div>
      `;
      sidebar.style.display = 'block';
    };
  }
});

// Function to get GPT-4 description
async function getGPTDescription(imageUrl) {
  try {
    // Get API key from storage
    const { apiKey } = await chrome.storage.sync.get('apiKey');
    if (!apiKey) {
      throw new Error('No API key found. Please set your OpenAI API key in the extension options.');
    }

    // Convert image to base64
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });

    // Call GPT-4o Mini API
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe the content of the image in Chinese, describe the age, gender, race and outfit of character(s), their poses and actions, and environment, decorations, tone and atmosphere correctly. Specify art style only when it's not photorealistic. Around 100 Chinese characters."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    const data = await gptResponse.json();
    console.log('GPT API Response:', data);

    if (!gptResponse.ok) {
      throw new Error(data.error?.message || 'Error calling GPT-4o Mini API');
    }

    return data.choices[0]?.message?.content || 'No description available';
  } catch (error) {
    console.error('Detailed error:', error);
    throw new Error(`Failed to get image description: ${error.message}`);
  }
}
