// Estado da aplicação
let cart = [];
let deliveryInfo = null;
let currentTab = 'compartilhavel';
let cardInstances = new Map();
let cartEventListeners = [];
let perfumesData = {
    compartilhavel: [],
    feminino: [],
    masculino: [],
    body: []
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

async function initApp() {
    await loadCSVData();
    setupEventListeners();
    updateCartCount();
    updateQuickSummary();
    loadCart();
    loadDeliveryInfo();
    renderAllPerfumes();
}

async function loadCSVData() {
    try {
        const response = await fetch('data/perfumes.csv');
        const csvText = await response.text();
        parseCSV(csvText);
    } catch (error) {
        console.error('Erro ao carregar o arquivo CSV:', error);
        showError('Erro ao carregar os dados dos perfumes. Por favor, recarregue a página.');
    }
}

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line);
        if (values.length !== headers.length) continue;
        
        const categoria = values[0].toLowerCase();
        const nome = values[1];
        
        const perfume = {
            nome: nome,
            preco30ml: values[2] ? parseInt(values[2]) : undefined,
            preco50ml: values[3] ? parseInt(values[3]) : undefined,
            preco100ml: values[4] ? parseInt(values[4]) : undefined,
            preco200ml: values[5] ? parseInt(values[5]) : undefined
        };
        
        if (categoria.includes('compartilhável')) {
            perfumesData.compartilhavel.push(perfume);
        } else if (categoria.includes('feminino')) {
            perfumesData.feminino.push(perfume);
        } else if (categoria.includes('masculino')) {
            perfumesData.masculino.push(perfume);
        } else if (categoria.includes('body')) {
            perfumesData.body.push(perfume);
        }
    }
    
    // Atualizar contadores nas abas
    updateTabCounts();
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current);
    return values;
}

function updateTabCounts() {
    document.getElementById('compartilhavel-count').textContent = `(${perfumesData.compartilhavel.length})`;
    document.getElementById('feminino-count').textContent = `(${perfumesData.feminino.length})`;
    document.getElementById('masculino-count').textContent = `(${perfumesData.masculino.length})`;
    document.getElementById('body-count').textContent = `(${perfumesData.body.length})`;
}

function renderAllPerfumes() {
    renderPerfumeGrid('compartilhavel', perfumesData.compartilhavel);
    renderPerfumeGrid('feminino', perfumesData.feminino);
    renderPerfumeGrid('masculino', perfumesData.masculino);
    renderBodySplashGrid('body', perfumesData.body);
    applyFilters();
}

function renderPerfumeGrid(genero, perfumes) {
    const grid = document.getElementById(`${genero}-grid`);
    if (!grid) return;
    
    if (perfumes.length === 0) {
        grid.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Carregando perfumes...</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    
    perfumes.forEach((perfume, index) => {
        const card = createPerfumeCard(perfume, genero, index);
        grid.appendChild(card);
        
        const cardId = `${genero}-${index}`;
        cardInstances.set(cardId, {
            card: card,
            perfume: perfume,
            genero: genero,
            originalName: getOriginalName(perfume.nome)
        });
    });
}

function getOriginalName(fullName) {
    let name = fullName;
    
    const termsToRemove = [
        ' - LV', ' - YSL', ' - XERJOF', ' BY KILIAN', ' BYREDO', ' REPLICA',
        ' .PARFUMS', ' - O.PARISI', ' - CHANEL', ' - CREED', ' LATTAFA',
        ' NISHANE', ' - DIOR', ' EDP', ' EDT', ' EXTRAIT', ' PARFUM',
        ' ELIXIR', ' INTENSE', ' PREMIUM', ' SPORT', ' MARINE', ' POUR HOMME',
        ' POUR FEMME', ' FOR HER', ' FOR HIM', ' - CACHAREL', ' - GIVENCHY',
        ' - ARMANI', ' - BULGARI', ' - VERSACE', ' - HERMES', ' - ROCHAS',
        ' - MONTALE', ' - SOSPIRO'
    ];
    
    termsToRemove.forEach(term => {
        if (name.includes(term)) {
            name = name.replace(term, '');
        }
    });
    
    name = name.replace(/\s*\d{4}\s*$/, '');
    name = name.replace(/\s*\(.*?\)\s*/g, ' ');
    name = name.replace(/\s+/g, ' ').trim();
    
    return name || fullName;
}

function createPerfumeCard(perfume, genero, index) {
    const card = document.createElement('div');
    card.className = `perfume-card ${genero}`;
    card.dataset.id = `${genero}-${index}`;
    card.dataset.name = perfume.nome.toLowerCase();
    
    const prices = [];
    if (perfume.preco200ml !== undefined) prices.push(perfume.preco200ml);
    if (perfume.preco100ml !== undefined) prices.push(perfume.preco100ml);
    if (perfume.preco30ml !== undefined) prices.push(perfume.preco30ml);
    if (perfume.preco50ml !== undefined) prices.push(perfume.preco50ml);
    
    if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        card.dataset.minPrice = minPrice;
        card.dataset.maxPrice = maxPrice;
    } else {
        card.dataset.minPrice = 0;
        card.dataset.maxPrice = 0;
    }
    
    const tem200ml = perfume.preco200ml !== undefined;
    const tem100ml = perfume.preco100ml !== undefined;
    const tem30ml = perfume.preco30ml !== undefined;
    const tem50ml = perfume.preco50ml !== undefined;
    
    const originalName = getOriginalName(perfume.nome);
    
    let sizeOptionsHTML = '<div class="size-options">';
    
    if (tem200ml) {
        sizeOptionsHTML += `
            <div class="size-option" data-size="200ml" data-price="${perfume.preco200ml}">
                <label>
                    <input type="radio" name="${genero}-${index}" value="200ml">
                    200ml <span class="concentration-badge">30% Parfum</span>
                </label>
                <span class="price">R$ ${perfume.preco200ml},00</span>
            </div>
        `;
    }
    
    if (tem100ml) {
        sizeOptionsHTML += `
            <div class="size-option" data-size="100ml" data-price="${perfume.preco100ml}">
                <label>
                    <input type="radio" name="${genero}-${index}" value="100ml">
                    100ml <span class="concentration-badge">33% Extract Parfum</span>
                </label>
                <span class="price">R$ ${perfume.preco100ml},00</span>
            </div>
        `;
    }
    
    if (tem30ml) {
        sizeOptionsHTML += `
            <div class="size-option" data-size="30ml" data-price="${perfume.preco30ml}">
                <label>
                    <input type="radio" name="${genero}-${index}" value="30ml">
                    30ml <span class="concentration-badge">33% Extract Parfum</span>
                </label>
                <span class="price">R$ ${perfume.preco30ml},00</span>
            </div>
        `;
    }
    
    if (tem50ml) {
        sizeOptionsHTML += `
            <div class="size-option" data-size="50ml" data-price="${perfume.preco50ml}">
                <label>
                    <input type="radio" name="${genero}-${index}" value="50ml">
                    50ml <span class="concentration-badge">20% Colônia</span>
                </label>
                <span class="price">R$ ${perfume.preco50ml},00</span>
            </div>
        `;
    }
    
    sizeOptionsHTML += '</div>';
    
    card.innerHTML = `
        <h3>Inspirado em: ${originalName}</h3>
        ${sizeOptionsHTML}
        <button class="add-btn" disabled>
            <i class="fas fa-cart-plus"></i> Adicionar
        </button>
    `;
    
    setupCardEvents(card, genero, index);
    
    return card;
}

function setupCardEvents(card, genero, index) {
    const sizeOptions = card.querySelectorAll('.size-option');
    const addBtn = card.querySelector('.add-btn');
    
    card.addEventListener('click', function(e) {
        if (e.target.closest('.size-option')) {
            const sizeOption = e.target.closest('.size-option');
            const sizeOptions = card.querySelectorAll('.size-option');
            
            sizeOptions.forEach(opt => opt.classList.remove('selected'));
            sizeOption.classList.add('selected');
            
            const radio = sizeOption.querySelector('input[type="radio"]');
            radio.checked = true;
            
            addBtn.disabled = false;
            addBtn.innerHTML = `<i class="fas fa-cart-plus"></i> Adicionar (R$ ${sizeOption.dataset.price},00)`;
        }
        
        if (e.target.closest('.add-btn')) {
            const selectedSizeOption = card.querySelector('.size-option.selected');
            if (selectedSizeOption) {
                const cardInstance = cardInstances.get(`${genero}-${index}`);
                if (!cardInstance) return;
                
                const size = selectedSizeOption.dataset.size;
                const price = parseInt(selectedSizeOption.dataset.price);
                
                addToCart(cardInstance.perfume.nome, genero, size, price, cardInstance.originalName);
                openCartSidebar();
                
                const originalText = addBtn.innerHTML;
                addBtn.innerHTML = '<i class="fas fa-check"></i> Adicionado!';
                addBtn.style.backgroundColor = '#2ecc71';
                
                setTimeout(() => {
                    addBtn.innerHTML = originalText;
                    addBtn.style.backgroundColor = '';
                    
                    const sizeOptions = card.querySelectorAll('.size-option');
                    sizeOptions.forEach(opt => opt.classList.remove('selected'));
                    card.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
                    addBtn.disabled = true;
                    addBtn.innerHTML = `<i class="fas fa-cart-plus"></i> Adicionar`;
                }, 1500);
            }
        }
    });
}

function renderBodySplashGrid(genero, items) {
    const grid = document.getElementById(`${genero}-grid`);
    if (!grid) return;
    
    if (items.length === 0) {
        grid.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Carregando body splash...</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    
    items.forEach((item, index) => {
        const originalName = getOriginalName(item.nome);
        
        const card = document.createElement('div');
        card.className = `perfume-card ${genero}`;
        card.dataset.id = `${genero}-${index}`;
        card.dataset.name = item.nome.toLowerCase();
        card.dataset.minPrice = item.preco200ml || 100;
        card.dataset.maxPrice = item.preco200ml || 100;
        
        card.innerHTML = `
            <h3>Inspirado em: ${originalName}</h3>
            <div class="size-options">
                <div class="size-option selected" data-size="200ml" data-price="${item.preco200ml || 100}">
                    <label>
                        <input type="radio" name="${genero}-${index}" value="200ml" checked>
                        200ml <span class="concentration-badge">20% Body Splash</span>
                    </label>
                    <span class="price">R$ ${item.preco200ml || 100},00</span>
                </div>
            </div>
            <button class="add-btn">
                <i class="fas fa-cart-plus"></i> Adicionar (R$ ${item.preco200ml || 100},00)
            </button>
        `;
        
        grid.appendChild(card);
        
        const cardId = `${genero}-${index}`;
        cardInstances.set(cardId, {
            card: card,
            perfume: item,
            genero: genero,
            originalName: originalName
        });
        
        card.addEventListener('click', function(e) {
            if (e.target.closest('.add-btn')) {
                const cardInstance = cardInstances.get(cardId);
                if (!cardInstance) return;
                
                addToCart(item.nome, 'body', '200ml', item.preco200ml || 100, originalName);
                openCartSidebar();
            }
        });
    });
}

function setupEventListeners() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Filtros de ordenação
    document.getElementById('sort-by').addEventListener('change', function() {
        applyFilters();
    });
    
    // Busca por nome
    document.getElementById('search-by-name').addEventListener('input', function() {
        applyFilters();
    });
    
    // Carrinho
    document.getElementById('cart-toggle').addEventListener('click', openCartSidebar);
    document.getElementById('close-cart').addEventListener('click', closeCartSidebar);
    document.getElementById('cart-overlay').addEventListener('click', closeCartSidebar);
    document.getElementById('quick-view-cart').addEventListener('click', openCartSidebar);
    
    // Limpar carrinho
    document.getElementById('clear-cart').addEventListener('click', clearCart);
    
    // Enviar pedido
    document.getElementById('cart-send-whatsapp').addEventListener('click', sendToWhatsApp);
    
    // Modal de entrega
    document.getElementById('delivery-info').addEventListener('click', openDeliveryModal);
    document.getElementById('go-home').addEventListener('click', goToHome);
    document.getElementById('close-delivery-modal').addEventListener('click', closeDeliveryModal);
    document.getElementById('delivery-modal-overlay').addEventListener('click', closeDeliveryModal);
    document.getElementById('save-delivery-info').addEventListener('click', saveDeliveryInfo);
    
    // Opções de entrega
    document.querySelectorAll('.delivery-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.delivery-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            
            const deliveryType = this.dataset.type;
            if (deliveryType === 'delivery') {
                document.getElementById('address-form').style.display = 'block';
                document.getElementById('pickup-info').style.display = 'none';
            } else {
                document.getElementById('address-form').style.display = 'none';
                document.getElementById('pickup-info').style.display = 'block';
            }
        });
    });
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) btn.classList.add('active');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tab}-tab`) content.classList.add('active');
    });
    
    currentTab = tab;
    applyFilters();
    
    // Limpar busca quando mudar de aba
    document.getElementById('search-by-name').value = '';
}

function applyFilters() {
    const sortBy = document.getElementById('sort-by').value;
    const searchTerm = document.getElementById('search-by-name').value.toLowerCase().trim();
    
    const grid = document.getElementById(`${currentTab}-grid`);
    if (!grid) return;
    
    const cards = Array.from(grid.querySelectorAll('.perfume-card'));
    
    let visibleCards = [];
    
    cards.forEach(card => {
        const perfumeName = card.querySelector('h3').textContent.toLowerCase();
        
        let shouldShow = true;
        
        if (searchTerm) {
            shouldShow = perfumeName.includes(searchTerm);
        }
        
        card.style.display = shouldShow ? 'block' : 'none';
        
        if (shouldShow) {
            visibleCards.push(card);
        }
    });
    
    visibleCards.sort((a, b) => {
        const nameA = a.querySelector('h3').textContent.toLowerCase();
        const nameB = b.querySelector('h3').textContent.toLowerCase();
        
        let priceA, priceB;
        
        if (sortBy === 'price-desc') {
            priceA = parseFloat(a.dataset.maxPrice) || 0;
            priceB = parseFloat(b.dataset.maxPrice) || 0;
            return priceB - priceA;
        } else if (sortBy === 'price-asc') {
            priceA = parseFloat(a.dataset.minPrice) || 0;
            priceB = parseFloat(b.dataset.minPrice) || 0;
            return priceA - priceB;
        } else if (sortBy === 'name-desc') {
            return nameB.localeCompare(nameA);
        } else {
            return nameA.localeCompare(nameB);
        }
    });
    
    const fragment = document.createDocumentFragment();
    
    visibleCards.forEach(card => {
        fragment.appendChild(card);
    });
    
    cards.forEach(card => {
        if (card.style.display === 'none') {
            fragment.appendChild(card);
        }
    });
    
    grid.innerHTML = '';
    grid.appendChild(fragment);
    
    if (searchTerm) {
        highlightSearchTerm(searchTerm);
    } else {
        document.querySelectorAll('.perfume-card h3').forEach(title => {
            const originalText = title.textContent;
            title.innerHTML = originalText;
        });
    }
}

function highlightSearchTerm(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    document.querySelectorAll('.perfume-card[style*="display: block"] h3').forEach(title => {
        const originalText = title.textContent;
        const regex = new RegExp(`(${term})`, 'gi');
        const highlighted = originalText.replace(regex, '<span class="highlight">$1</span>');
        title.innerHTML = highlighted;
    });
}

// Funções do Carrinho
function addToCart(name, genero, size, price, originalName) {
    const existingIndex = cart.findIndex(item => 
        item.name === name && item.size === size
    );
    
    if (existingIndex !== -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            name,
            genero,
            size,
            price,
            originalName: originalName || name,
            quantity: 1
        });
    }
    
    updateCartCount();
    updateCartDisplay();
    updateQuickSummary();
    saveCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartCount();
    updateCartDisplay();
    updateQuickSummary();
    saveCart();
}

function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = totalItems;
}

function updateQuickSummary() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    document.getElementById('quick-items-count').textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
    document.getElementById('quick-total-price').textContent = `Total: R$ ${totalPrice},00`;
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total-price');
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Seu carrinho está vazio</p>
            </div>
        `;
        cartTotal.textContent = 'R$ 0,00';
        return;
    }
    
    let html = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        let concentration = '';
        if (item.size === '200ml') {
            concentration = ' (30% Parfum)';
        } else if (item.size === '100ml' || item.size === '30ml') {
            concentration = ' (33% Extract Parfum)';
        } else if (item.size === '50ml') {
            concentration = ' (20% Colônia)';
        }
        
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>Inspirado em: ${item.originalName}</h4>
                    <small>${item.size}${concentration} | ${getGeneroName(item.genero)}</small>
                    <div class="price">R$ ${item.price},00</div>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-controls">
                        <button class="quantity-btn minus" data-index="${index}">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" data-index="${index}">
                        <button class="quantity-btn plus" data-index="${index}">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <button class="remove-item-btn" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartItems.innerHTML = html;
    cartTotal.textContent = `R$ ${total},00`;
    
    removeCartEventListeners();
    
    const handleCartClick = function(e) {
        const minusBtn = e.target.closest('.quantity-btn.minus');
        const plusBtn = e.target.closest('.quantity-btn.plus');
        const removeBtn = e.target.closest('.remove-item-btn');
        
        if (minusBtn) {
            const index = parseInt(minusBtn.dataset.index);
            if (cart[index].quantity > 1) {
                cart[index].quantity -= 1;
                updateCartCount();
                updateCartDisplay();
                updateQuickSummary();
                saveCart();
            }
        } else if (plusBtn) {
            const index = parseInt(plusBtn.dataset.index);
            cart[index].quantity += 1;
            updateCartCount();
            updateCartDisplay();
            updateQuickSummary();
            saveCart();
        } else if (removeBtn) {
            const index = parseInt(removeBtn.dataset.index);
            removeFromCart(index);
        }
    };
    
    const handleCartChange = function(e) {
        if (e.target.classList.contains('quantity-input')) {
            const index = parseInt(e.target.dataset.index);
            let newQuantity = parseInt(e.target.value);
            
            if (isNaN(newQuantity) || newQuantity < 1) {
                newQuantity = 1;
                e.target.value = 1;
            }
            
            cart[index].quantity = newQuantity;
            updateCartCount();
            updateCartDisplay();
            updateQuickSummary();
            saveCart();
        }
    };
    
    cartItems.addEventListener('click', handleCartClick);
    cartItems.addEventListener('change', handleCartChange);
    
    cartEventListeners.push({
        element: cartItems,
        type: 'click',
        handler: handleCartClick
    });
    
    cartEventListeners.push({
        element: cartItems,
        type: 'change',
        handler: handleCartChange
    });
}

function removeCartEventListeners() {
    cartEventListeners.forEach(listener => {
        listener.element.removeEventListener(listener.type, listener.handler);
    });
    cartEventListeners = [];
}

function getGeneroName(genero) {
    switch(genero) {
        case 'compartilhavel': return 'Compartilhável';
        case 'feminino': return 'Feminino';
        case 'masculino': return 'Masculino';
        case 'body': return 'Body Splash';
        default: return genero;
    }
}

function openCartSidebar() {
    document.getElementById('cart-overlay').style.display = 'block';
    document.getElementById('cart-sidebar').classList.add('open');
}

function closeCartSidebar() {
    document.getElementById('cart-overlay').style.display = 'none';
    document.getElementById('cart-sidebar').classList.remove('open');
}

function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Tem certeza que deseja limpar todos os itens do carrinho?')) {
        cart = [];
        updateCartCount();
        updateCartDisplay();
        updateQuickSummary();
        saveCart();
    }
}

function saveCart() {
    localStorage.setItem('perfume_cart', JSON.stringify(cart));
}

function loadCart() {
    const savedCart = localStorage.getItem('perfume_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartCount();
        updateQuickSummary();
    }
}

// Funções de Entrega
function openDeliveryModal() {
    document.getElementById('delivery-modal-overlay').style.display = 'block';
    document.getElementById('delivery-modal').style.display = 'block';
    
    if (deliveryInfo) {
        if (deliveryInfo.type === 'delivery') {
            document.querySelector('.delivery-option[data-type="delivery"]').click();
            document.getElementById('client-name').value = deliveryInfo.name || '';
            document.getElementById('client-address').value = deliveryInfo.address || '';
            document.getElementById('client-complement').value = deliveryInfo.complement || '';
            document.getElementById('client-phone').value = deliveryInfo.phone || '';
        } else {
            document.querySelector('.delivery-option[data-type="pickup"]').click();
            document.getElementById('pickup-name').value = deliveryInfo.name || '';
            document.getElementById('pickup-phone').value = deliveryInfo.phone || '';
        }
    }
}

function closeDeliveryModal() {
    document.getElementById('delivery-modal-overlay').style.display = 'none';
    document.getElementById('delivery-modal').style.display = 'none';
}

function saveDeliveryInfo() {
    const deliveryType = document.querySelector('.delivery-option.selected').dataset.type;
    
    let info = { type: deliveryType };
    
    if (deliveryType === 'delivery') {
        const name = document.getElementById('client-name').value.trim();
        const address = document.getElementById('client-address').value.trim();
        const complement = document.getElementById('client-complement').value.trim();
        const phone = document.getElementById('client-phone').value.trim();
        
        if (!name || !address) {
            alert('Por favor, preencha seu nome e endereço para entrega.');
            return;
        }
        
        const phoneDigits = phone.replace(/\D/g, '');
        if (!phoneDigits || phoneDigits.length !== 11) {
            alert('Por favor, preencha um telefone válido com DDD (11 dígitos).');
            document.getElementById('client-phone').focus();
            return;
        }
        
        info = { ...info, name, address, complement, phone: phoneDigits };
    } else {
        const name = document.getElementById('pickup-name').value.trim();
        const phone = document.getElementById('pickup-phone').value.trim();
        
        if (!name) {
            alert('Por favor, preencha seu nome para retirada.');
            return;
        }
        
        const phoneDigits = phone.replace(/\D/g, '');
        if (!phoneDigits || phoneDigits.length !== 11) {
            alert('Por favor, preencha um telefone válido com DDD (11 dígitos).');
            document.getElementById('pickup-phone').focus();
            return;
        }
        
        info = { ...info, name, phone: phoneDigits };
    }
    
    deliveryInfo = info;
    localStorage.setItem('delivery_info', JSON.stringify(info));
    showNotification('Informações salvas com sucesso!');
    closeDeliveryModal();
}

function loadDeliveryInfo() {
    const savedInfo = localStorage.getItem('delivery_info');
    if (savedInfo) {
        deliveryInfo = JSON.parse(savedInfo);
    }
}

function sendToWhatsApp() {
    if (cart.length === 0) {
        alert('Seu carrinho está vazio. Adicione perfumes antes de enviar o pedido.');
        return;
    }
    
    if (!deliveryInfo) {
        openDeliveryModal();
        alert('Por favor, preencha as informações de entrega/retirada antes de enviar o pedido.');
        return;
    }
    
    if (deliveryInfo.type === 'pickup' && (!deliveryInfo.name || !deliveryInfo.phone)) {
        openDeliveryModal();
        document.querySelector('.delivery-option[data-type="pickup"]').click();
        alert('Para retirada no local, é necessário informar seu nome e telefone.');
        return;
    }
    
    if (deliveryInfo.type === 'delivery' && (!deliveryInfo.name || !deliveryInfo.address || !deliveryInfo.phone)) {
        openDeliveryModal();
        document.querySelector('.delivery-option[data-type="delivery"]').click();
        alert('Para entrega, é necessário informar seu nome, endereço e telefone.');
        return;
    }
    
    if (deliveryInfo.phone.length !== 11) {
        openDeliveryModal();
        alert('O telefone informado é inválido. Deve ter exatamente 11 dígitos (com DDD).');
        if (deliveryInfo.type === 'delivery') {
            document.querySelector('.delivery-option[data-type="delivery"]').click();
            document.getElementById('client-phone').value = deliveryInfo.phone;
            document.getElementById('client-phone').focus();
        } else {
            document.querySelector('.delivery-option[data-type="pickup"]').click();
            document.getElementById('pickup-phone').value = deliveryInfo.phone;
            document.getElementById('pickup-phone').focus();
        }
        return;
    }
    
    let message = `*PEDIDO DE PERFUMES - CRAFTCARE STORE*\n\n`;
    message += `*Perfumes inspirados nas melhores fragrâncias do mercado*\n\n`;
    
    const grupos = {
        compartilhavel: cart.filter(item => item.genero === 'compartilhavel'),
        feminino: cart.filter(item => item.genero === 'feminino'),
        masculino: cart.filter(item => item.genero === 'masculino'),
        body: cart.filter(item => item.genero === 'body')
    };
    
    ['compartilhavel', 'feminino', 'masculino', 'body'].forEach(genero => {
        if (grupos[genero].length > 0) {
            message += `*${getGeneroName(genero).toUpperCase()}:*\n`;
            grupos[genero].forEach(item => {
                let concentration = '';
                if (item.size === '200ml') {
                    concentration = ' (30% Parfum)';
                } else if (item.size === '100ml' || item.size === '30ml') {
                    concentration = ' (33% Extract Parfum)';
                } else if (item.size === '50ml') {
                    concentration = ' (20% Colônia)';
                } else if (item.genero === 'body') {
                    concentration = ' (20% Body Splash)';
                }
                
                message += `- ${item.originalName}${concentration}\n`;
                message += `  Tamanho: ${item.size} | Quantidade: ${item.quantity} | R$ ${item.price * item.quantity},00\n`;
            });
            message += '\n';
        }
    });
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    message += `*TOTAL: R$ ${total},00*\n\n`;
    
    message += `*INFORMAÇÕES TÉCNICAS:*\n`;
    message += `• 200ml: 30% Parfum\n`;
    message += `• 100ml e 30ml: 33% Extract Parfum\n`;
    message += `• 50ml: 20% Colônia\n`;
    message += `• Body Splash: 20%\n\n`;
    
    if (deliveryInfo.type === 'delivery') {
        message += `*DADOS PARA ENTREGA:*\n`;
        message += `Nome: ${deliveryInfo.name}\n`;
        message += `Telefone: ${deliveryInfo.phone}\n`;
        message += `Endereço: ${deliveryInfo.address}\n`;
        if (deliveryInfo.complement) {
            message += `Complemento: ${deliveryInfo.complement}\n`;
        }
        message += `\n*Frete: A combinar*\n`;
    } else {
        message += `*RETIRADA NO LOCAL:*\n`;
        message += `Nome: ${deliveryInfo.name}\n`;
        message += `Telefone: ${deliveryInfo.phone}\n`;
        message += `\n*Endereço para retirada será informado após confirmação.*\n`;
    }
    
    message += `\n*Obrigado pelo pedido!*\n`;
    
    const phoneNumber = "5519998978060";
    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    const newWindow = window.open(whatsappURL, '_blank');
    
    if (newWindow) {
        setTimeout(() => {
            cart = [];
            updateCartCount();
            updateCartDisplay();
            updateQuickSummary();
            saveCart();
            
            closeCartSidebar();
            
            showNotification('Pedido enviado! O carrinho foi limpo.');
        }, 500);
    } else {
        alert('Não foi possível abrir o WhatsApp. Verifique se o WhatsApp está instalado e tente novamente.');
    }
}

function goToHome() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    switchTab('compartilhavel');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #25D366;
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        z-index: 2000;
        box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div style="text-align: center; padding: 40px; background: #fff3f3; border-radius: 10px; border: 2px solid #ff6b6b; margin: 20px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b; margin-bottom: 15px;"></i>
            <h3 style="color: #d32f2f; margin-bottom: 10px;">Erro ao carregar dados</h3>
            <p style="color: #666;">${message}</p>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #2575fc; color: white; border: none; border-radius: 5px; cursor: pointer;">
                <i class="fas fa-redo"></i> Recarregar Página
            </button>
        </div>
    `;
    
    const container = document.querySelector('.container');
    container.innerHTML = '';
    container.appendChild(errorDiv);
}

// Adicionar estilos para animações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);