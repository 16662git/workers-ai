export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle preflight CORS requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Serve HTML interface
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML_CONTENT, {
        headers: { 
          'content-type': 'text/html;charset=UTF-8',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }

    // API endpoint for chat
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      return await handleChat(request, env);
    }

    // API endpoint for products
    if (url.pathname === '/api/products' && request.method === 'GET') {
      return await handleProducts(env);
    }

    return new Response('Not found', { 
      status: 404,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  },
};

// Handle chat requests
async function handleChat(request, env) {
  try {
    const { message, conversationHistory = [] } = await request.json();
    
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }
    
    // Get products data
    const products = await getProducts(env);
    
    // Prepare system prompt with product information
    const systemPrompt = createSystemPrompt(products);
    
    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: message }
    ];

    console.log('Sending request to AI with messages:', JSON.stringify(messages));

    // Run AI model
    const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
      messages,
      stream: true,
    });

    return new Response(response, {
      headers: { 
        'content-type': 'text/event-stream',
        'Access-Control-Allow-Origin': '*'
      },
    });
  } catch (error) {
    console.error('Error in handleChat:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  }
}

// Handle products request
async function handleProducts(env) {
  try {
    const products = await getProducts(env);
    return new Response(JSON.stringify(products), {
      headers: { 
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  } catch (error) {
    console.error('Error in handleProducts:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to load products',
      details: error.message 
    }), {
      status: 500,
      headers: { 
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  }
}

// Get products from KV or fetch from URL
async function getProducts(env) {
  // Use fallback products if fetch fails
  const fallbackProducts = {
    product: [
      {
        "title": "Masker 3D Bordir",
        "slug": "masker-3d-bordir",
        "id": "product-masker-3d-bodir-3lapis-tasikmalaya",
        "category": "",
        "url": "/product/masker-3d-bodir-3lapis-tasikmalaya/",
        "sku": "masker3D",
        "price": "30.000",
        "discount": "24.000",
        "stok": "Tersedia",
        "description": "Masker 3D Bordir, 3 Lapisan kain, nyaman digunakan sehari-hari dengan desain yang trendy",
        "narrative": "",
        "image": "https://cf.shopee.co.id/file/86e632480a9b475919f2d3cf08caa4ef",
        "styles": [
          { "name": "hitam", "color": "#000000", "image_path": "https://cf.shopee.co.id/file/5194cfd90af282168d7351d1350c924c" },
          { "name": "navi", "color": "#4a5265", "image_path": "https://cf.shopee.co.id/file/6761d66ebb1f34b00a07583091ff62c6" },
          { "name": "marun", "color": "#ba2342", "image_path": "https://cf.shopee.co.id/file/d78fe06d94f7f92cfae0505266a78186" },
          { "name": "mustard", "color": "#efa22c", "image_path": "https://cf.shopee.co.id/file/24200fe4753c8a5cb75d1ef3e1458f08" }
        ]
      }
    ]
  };

  try {
    // Try to fetch from external URL
    const response = await fetch('https://plus62store.github.io/products.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Cloudflare-Worker)'
      }
    });
    
    if (response.ok) {
      const products = await response.json();
      return products;
    } else {
      console.warn('Failed to fetch products, using fallback');
      return fallbackProducts;
    }
  } catch (error) {
    console.warn('Error fetching products, using fallback:', error);
    return fallbackProducts;
  }
}

// Create system prompt with product information
function createSystemPrompt(products) {
  const productList = products.product.map(p => 
    `- ${p.title}: ${p.description} (Harga Normal: Rp ${p.price}, Harga Diskon: Rp ${p.discount}, Stok: ${p.stok})`
  ).join('\n');

  return `You are a friendly and helpful e-commerce assistant for an online store in Indonesia. Your role is to help customers find products, answer questions, and assist with shopping.

AVAILABLE PRODUCTS:
${productList}

IMPORTANT GUIDELINES:
1. Be friendly, helpful, and speak in a conversational tone
2. Understand user queries about products and provide accurate information
3. If user asks about a product that matches available items, provide details about price, description, and stock
4. If user request is unclear or missing information, politely ask for clarification
5. You can suggest adding items to cart when user expresses interest
6. Always respond in the same language as the user
7. Keep responses concise but helpful

CART MANAGEMENT:
- When user clearly wants to add an item to cart, include: [ADD_TO_CART:PRODUCT_ID:1]
- When user asks about cart, provide summary of items

RESPONSE FORMAT:
- Use natural, conversational language
- Focus on assisting with product selection and purchases
- Be enthusiastic about helping customers`;
}

// HTML Content tetap sama seperti sebelumnya
const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Online Store</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 20px;
            height: calc(100vh - 40px);
        }

        .products-section {
            background: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow-y: auto;
        }

        .chat-section {
            display: flex;
            flex-direction: column;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .chat-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }

        .chat-messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #f8f9fa;
        }

        .message {
            margin-bottom: 15px;
            padding: 12px 16px;
            border-radius: 18px;
            max-width: 80%;
            word-wrap: break-word;
        }

        .user-message {
            background: #007bff;
            color: white;
            margin-left: auto;
            border-bottom-right-radius: 5px;
        }

        .ai-message {
            background: white;
            color: #333;
            border: 1px solid #e0e0e0;
            border-bottom-left-radius: 5px;
        }

        .chat-input {
            padding: 20px;
            border-top: 1px solid #e0e0e0;
            background: white;
        }

        .input-group {
            display: flex;
            gap: 10px;
        }

        .chat-input input {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #ddd;
            border-radius: 25px;
            outline: none;
            font-size: 14px;
        }

        .chat-input button {
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            transition: transform 0.2s;
        }

        .chat-input button:hover {
            transform: translateY(-2px);
        }

        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .product-card {
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            overflow: hidden;
            background: white;
            transition: transform 0.3s, box-shadow 0.3s;
            cursor: pointer;
        }

        .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .product-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }

        .product-info {
            padding: 15px;
        }

        .product-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
        }

        .product-price {
            margin-bottom: 8px;
        }

        .original-price {
            text-decoration: line-through;
            color: #999;
            font-size: 14px;
            margin-right: 8px;
        }

        .discount-price {
            color: #e74c3c;
            font-weight: 600;
            font-size: 16px;
        }

        .product-stock {
            font-size: 12px;
            color: #666;
            margin-bottom: 12px;
        }

        .view-details-btn {
            width: 100%;
            padding: 8px 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        }

        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }

        .modal-content {
            background: white;
            border-radius: 15px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        }

        .modal-header {
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .close-modal {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
        }

        .modal-body {
            padding: 20px;
        }

        .product-detail-image {
            width: 100%;
            height: 300px;
            object-fit: cover;
            border-radius: 10px;
            margin-bottom: 15px;
        }

        .style-options {
            display: flex;
            gap: 10px;
            margin: 15px 0;
            flex-wrap: wrap;
        }

        .style-option {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 2px solid transparent;
            cursor: pointer;
            transition: border-color 0.3s;
        }

        .style-option.selected {
            border-color: #333;
        }

        .add-to-cart-btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 15px;
        }

        .loading {
            text-align: center;
            color: #666;
            padding: 10px;
        }

        .error {
            text-align: center;
            color: #e74c3c;
            padding: 10px;
            background: #ffeaea;
            border-radius: 8px;
            margin: 10px 0;
        }

        @media (max-width: 768px) {
            .container {
                grid-template-columns: 1fr;
                height: auto;
            }
            
            .products-grid {
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="products-section">
            <h2>Our Products</h2>
            <div class="products-grid" id="productsGrid">
                <div class="loading">Loading products...</div>
            </div>
        </div>
        
        <div class="chat-section">
            <div class="chat-header">
                <h2>AI Shopping Assistant</h2>
                <p>Ask me about products or help with your order</p>
            </div>
            <div class="chat-messages" id="chatMessages">
                <div class="message ai-message">
                    👋 Hello! I'm your AI shopping assistant. How can I help you today? You can ask about products, prices, or request to see specific items.
                </div>
            </div>
            <div class="chat-input">
                <div class="input-group">
                    <input type="text" id="messageInput" placeholder="Type your message..." onkeypress="handleKeyPress(event)">
                    <button onclick="sendMessage()">Send</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Product Detail Modal -->
    <div class="modal" id="productModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="modalProductTitle">Product Details</h3>
                <button class="close-modal" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body" id="modalProductBody">
                <!-- Product details will be inserted here -->
            </div>
        </div>
    </div>

    <script>
        let products = [];
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        let conversationHistory = [];

        // Load products on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadProducts();
            updateCartIndicator();
        });

        // Load products from API
        async function loadProducts() {
            try {
                const response = await fetch('/api/products');
                if (!response.ok) {
                    throw new Error('Failed to load products');
                }
                const data = await response.json();
                products = data.product;
                displayProducts(products);
            } catch (error) {
                console.error('Error loading products:', error);
                document.getElementById('productsGrid').innerHTML = 
                    '<div class="error">Error loading products. Please refresh the page.</div>';
            }
        }

        // Display products in grid
        function displayProducts(productsToShow) {
            const grid = document.getElementById('productsGrid');
            
            if (productsToShow.length === 0) {
                grid.innerHTML = '<div class="loading">No products found</div>';
                return;
            }

            grid.innerHTML = productsToShow.map(product => 
                \`<div class="product-card" data-product-id="\${product.id}">
                    <img src="\${product.image}" alt="\${product.title}" class="product-image" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                    <div class="product-info">
                        <h3 class="product-title">\${product.title}</h3>
                        <p class="product-price">
                            <span class="original-price">Rp \${product.price}</span>
                            <span class="discount-price">Rp \${product.discount}</span>
                        </p>
                        <p class="product-stock">\${product.stok}</p>
                        <button class="view-details-btn" onclick="showProductDetail('\${product.id}')">View Details</button>
                    </div>
                </div>\`
            ).join('');
        }

        // Show product detail modal
        function showProductDetail(productId) {
            const product = products.find(p => p.id === productId);
            if (!product) return;

            const modal = document.getElementById('productModal');
            const modalTitle = document.getElementById('modalProductTitle');
            const modalBody = document.getElementById('modalProductBody');

            modalTitle.textContent = product.title;
            
            let stylesHtml = '';
            if (product.styles && product.styles.length > 0) {
                stylesHtml = \`
                    <div class="style-options">
                        <p><strong>Available Colors:</strong></p>
                        \${product.styles.map(style => 
                            \`<div class="style-option" style="background-color: \${style.color}" title="\${style.name}" onclick="selectStyle(this)"></div>\`
                        ).join('')}
                    </div>
                \`;
            }

            modalBody.innerHTML = \`
                <img src="\${product.image}" alt="\${product.title}" class="product-detail-image" onerror="this.src='https://via.placeholder.com/500x300?text=No+Image'">
                <p><strong>Description:</strong> \${product.description}</p>
                <p><strong>Price:</strong> <span style="text-decoration: line-through; color: #999;">Rp \${product.price}</span> <span style="color: #e74c3c; font-weight: bold;">Rp \${product.discount}</span></p>
                <p><strong>Stock:</strong> \${product.stok}</p>
                \${stylesHtml}
                <button class="add-to-cart-btn" onclick="addToCart('\${product.id}')">Add to Cart</button>
            \`;

            modal.style.display = 'flex';
        }

        // Close modal
        function closeModal() {
            document.getElementById('productModal').style.display = 'none';
        }

        // Select style option
        function selectStyle(element) {
            document.querySelectorAll('.style-option').forEach(opt => opt.classList.remove('selected'));
            element.classList.add('selected');
        }

        // Add product to cart
        function addToCart(productId) {
            const product = products.find(p => p.id === productId);
            if (!product) return;

            const existingItem = cart.find(item => item.id === productId);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id: productId,
                    title: product.title,
                    price: product.discount,
                    image: product.image,
                    quantity: 1
                });
            }

            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartIndicator();
            closeModal();
            
            // Add message to chat
            addMessage(\`✅ I've added \${product.title} to your cart!\`, 'ai');
        }

        // Update cart indicator
        function updateCartIndicator() {
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            console.log('Cart updated:', totalItems, 'items');
        }

        // Send message to AI
        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (!message) return;

            // Add user message to chat
            addMessage(message, 'user');
            input.value = '';

            // Show loading indicator
            const loadingId = addMessage('🤔 Thinking...', 'ai', true);

            try {
                // Add to conversation history
                conversationHistory.push({ role: 'user', content: message });

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message,
                        conversationHistory
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.details || 'Network response was not ok');
                }

                // Remove loading message
                removeMessage(loadingId);

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let aiMessage = '';
                let aiMessageId = addMessage('', 'ai', true);

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') break;

                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.response) {
                                    aiMessage += parsed.response;
                                    updateAIMessage(aiMessageId, aiMessage);
                                }
                            } catch (e) {
                                // Skip invalid JSON
                            }
                        }
                    }
                }

                // Check if AI wants to add to cart
                const addToCartMatch = aiMessage.match(/\\[ADD_TO_CART:([^:]+):(\\d+)\\]/);
                if (addToCartMatch) {
                    const productId = addToCartMatch[1];
                    const quantity = parseInt(addToCartMatch[2]);
                    addToCart(productId);
                    // Remove the cart command from displayed message
                    aiMessage = aiMessage.replace(/\\[ADD_TO_CART:[^\\]]+\\]/, '');
                    updateAIMessage(aiMessageId, aiMessage);
                }

                // Add to conversation history
                conversationHistory.push({ role: 'assistant', content: aiMessage });

            } catch (error) {
                console.error('Error:', error);
                removeMessage(loadingId);
                addMessage(\`❌ Sorry, I encountered an error: \${error.message}\`, 'ai');
            }
        }

        // Add message to chat
        function addMessage(content, sender, isTemp = false) {
            const messagesContainer = document.getElementById('chatMessages');
            const messageId = 'msg-' + Date.now();
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${sender}-message\`;
            messageDiv.id = messageId;
            messageDiv.innerHTML = formatMessage(content);
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            return isTemp ? messageId : null;
        }

        // Remove temporary message
        function removeMessage(messageId) {
            const message = document.getElementById(messageId);
            if (message) message.remove();
        }

        // Update AI message content
        function updateAIMessage(messageId, content) {
            const message = document.getElementById(messageId);
            if (message) {
                message.innerHTML = formatMessage(content);
                document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
            }
        }

        // Format message content
        function formatMessage(content) {
            return content.replace(/\\n/g, '<br>');
        }

        // Handle Enter key press
        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('productModal');
            if (event.target === modal) {
                closeModal();
            }
        }
    </script>
</body>
</html>
`;
