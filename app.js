let products = [];
let fuse;

window.onload = () => {
  fetch('data.json')
    .then(res => res.json())
    .then(data => {
      // Normalize hotel and product names for fuzzy match
      products = data.map(item => ({
        ...item,
        Hotel: item.Hotel.toLowerCase(),
        Product: item.Product.toLowerCase()
      }));

      fuse = new Fuse(products, {
        keys: ['Hotel', 'Product'],
        threshold: 0.4,
        includeScore: true
      });

      showWelcomeMessage();
    });
};

const messages = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');

// Show welcome
function showWelcomeMessage() {
  appendMessage("bot", "👋 Welcome! Type a <strong>Hotel name + Product name</strong> to check the rate.<br><br>Example: <code>Chula Hotel Mozzarella</code><br>Or type <code>Chula all</code> to see all products.<br>You can also 📷 upload a hotel bill.");
}

// Form submit
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = userInput.value.trim();
  if (query) {
    appendMessage("user", query);
    processQuery(query.toLowerCase());
    userInput.value = '';
  }
});

// Shortcut buttons
function insertShortcut(text) {
  userInput.value = text;
  userInput.focus();
}

// Append message
function appendMessage(sender, text) {
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  div.innerHTML = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// Process query from user input
function processQuery(input) {
  const hotelList = [...new Set(products.map(p => p.Hotel))];
  const hotelFuse = new Fuse(hotelList, { threshold: 0.4 });

  const inputWords = input.split(" ");
  let matchedHotel = null;

  for (let word of inputWords) {
    const match = hotelFuse.search(word);
    if (match.length > 0) {
      matchedHotel = match[0].item;
      break;
    }
  }

  if (!matchedHotel) {
    appendMessage("bot", "❌ Hotel not recognized. Please type full or partial hotel name.");
    return;
  }

  const hotelProducts = products.filter(p => p.Hotel === matchedHotel);
  const hotelWords = matchedHotel.split(" ");
  const productWords = inputWords.filter(word => !hotelWords.includes(word));
  const productQuery = productWords.join(" ").trim();

  if (productQuery === "all" || productQuery === "all products") {
    showHotelProducts(matchedHotel, hotelProducts);
    return;
  }

  const productFuse = new Fuse(hotelProducts, {
    keys: ['Product'],
    threshold: 0.4,
    includeScore: true
  });

  if (!productQuery) {
    appendMessage("bot", `✅ Hotel matched: <strong>${titleCase(matchedHotel)}</strong><br>Now type product name to search or type <code>all</code> to see everything.`);
    return;
  }

  const result = productFuse.search(productQuery);

  if (result.length === 0) {
    appendMessage("bot", `❌ No matching products found for <strong>${titleCase(matchedHotel)}</strong>.`);
    return;
  }

  let reply = `<strong>🏨 ${titleCase(matchedHotel)}</strong><br>`;
  result.forEach(({ item }) => {
    reply += `• ${titleCase(item.Product)} – ₹${item.Rate}<br>`;
  });

  appendMessage("bot", reply);
}

// Show full product list
function showHotelProducts(hotelName, productList) {
  if (productList.length === 0) {
    appendMessage("bot", `❌ No products found for <strong>${titleCase(hotelName)}</strong>.`);
    return;
  }

  let reply = `<strong>🏨 ${titleCase(hotelName)}</strong><br>`;
  productList.forEach(item => {
    reply += `• ${titleCase(item.Product)} – ₹${item.Rate}<br>`;
  });

  appendMessage("bot", reply);
}

// Convert to Title Case
function titleCase(str) {
  return str.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

// 🔴 Clear chat functionality
function clearChat() {
  messages.innerHTML = '';
  showWelcomeMessage();
}

// 📷 OCR Scan from uploaded bill
document.getElementById("scan-button").addEventListener("click", () => {
  const fileInput = document.getElementById("bill-file");
  const hotelNameInput = document.getElementById("hotel-name-input");

  if (!fileInput.files.length || !hotelNameInput.value.trim()) {
    alert("Please upload a bill and type the hotel name.");
    return;
  }

  const hotelNameRaw = hotelNameInput.value.trim().toLowerCase();

  const hotelList = [...new Set(products.map(p => p.Hotel))];
  const hotelFuse = new Fuse(hotelList, { threshold: 0.4 });
  const hotelMatch = hotelFuse.search(hotelNameRaw);

  if (!hotelMatch.length) {
    appendMessage("bot", "❌ Hotel not recognized from the input.");
    return;
  }

  const matchedHotel = hotelMatch[0].item;
  const hotelProducts = products.filter(p => p.Hotel === matchedHotel);

  appendMessage("bot", "📄 Scanning uploaded bill...");

  Tesseract.recognize(fileInput.files[0], 'eng').then(result => {
    const scannedText = result.data.text.toLowerCase();
    const lines = scannedText.split(/\n|\r/).map(line => line.trim()).filter(line => line);

    const productFuse = new Fuse(hotelProducts, {
      keys: ['Product'],
      threshold: 0.4,
      includeScore: true
    });

    const matchedLines = [];
    lines.forEach(line => {
      const match = productFuse.search(line);
      if (match.length > 0) {
        matchedLines.push(match[0].item);
      }
    });

    if (matchedLines.length === 0) {
      appendMessage("bot", `❌ No matching products found from the scanned bill for <strong>${titleCase(matchedHotel)}</strong>.`);
    } else {
      let reply = `<strong>📋 Scanned Products for ${titleCase(matchedHotel)}</strong><br>`;
      matchedLines.forEach(item => {
        reply += `• ${titleCase(item.Product)} – ₹${item.Rate}<br>`;
      });
      appendMessage("bot", reply);
    }
  }).catch(err => {
    appendMessage("bot", "❌ Failed to scan image. Please try again.");
  });
});
