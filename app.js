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
  appendMessage("bot", "👋 Welcome! Type a <strong>Hotel name + Product name</strong> to check the rate.<br><br>Example: <code>Chula Hotel Mozzarella</code>");
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

// ✅ Final hotel+product fuzzy search logic (word-by-word match)
function processQuery(input) {
  const hotelList = [...new Set(products.map(p => p.Hotel))];
  const hotelFuse = new Fuse(hotelList, { threshold: 0.4 });

  const inputWords = input.split(" ");
  let matchedHotel = null;

  // 🔍 New: Try matching each word to a hotel
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

  // Get all products for that hotel
  const hotelProducts = products.filter(p => p.Hotel === matchedHotel);
  const productFuse = new Fuse(hotelProducts, {
    keys: ['Product'],
    threshold: 0.4,
    includeScore: true
  });

  // Extract likely product query by removing hotel words
  const hotelWords = matchedHotel.split(" ");
  const productWords = inputWords.filter(word => !hotelWords.includes(word));
  const productQuery = productWords.join(" ").trim();

  if (!productQuery) {
    appendMessage("bot", `✅ Hotel matched: <strong>${titleCase(matchedHotel)}</strong><br>Now type product name to search.`);
    return;
  }

  // Search for product in matched hotel
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

// Convert to Title Case
function titleCase(str) {
  return str.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

// 🔴 Clear chat functionality
function clearChat() {
  messages.innerHTML = '';
  showWelcomeMessage();
}
