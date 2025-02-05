// Remove existing context menus
chrome.contextMenus.removeAll(() => {
  // Create context menu item
  chrome.contextMenus.create({
    id: "imageReader",
    title: "Image Reader",
    contexts: ["image"],
    documentUrlPatterns: ["*://*.xiaohongshu.com/*", "<all_urls>"]
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "imageReader") {
    console.log("Image Reader clicked", info.srcUrl);
    
    // Ensure content script is loaded before sending message
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        return true; // Just to check if we can execute scripts
      }
    }).then(() => {
      chrome.tabs.sendMessage(tab.id, {
        type: "SHOW_IMAGE_INFO",
        imageUrl: info.srcUrl
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to send message:', chrome.runtime.lastError);
          // Attempt to inject content script if it's not already there
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }).then(() => {
            // Retry sending the message
            chrome.tabs.sendMessage(tab.id, {
              type: "SHOW_IMAGE_INFO",
              imageUrl: info.srcUrl
            });
          });
        }
      });
    }).catch(err => {
      console.error('Failed to execute script:', err);
    });
  }
});
