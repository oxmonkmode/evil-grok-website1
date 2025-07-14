// Evil Grok Web Interface - Clean Implementation
class GrokChat {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 5000;
        this.maxReconnectAttempts = 5;
        this.reconnectAttempts = 0;
        this.isThinking = false;
        this.elements = {};
        this.currentUserMessage = '';
        
        this.init();
    }

    init() {
        this.elements = {
            landingView: document.getElementById('landing-view'),
            chatView: document.getElementById('chat-view'),
            inputArea: document.getElementById('input-area'),
            landingInput: document.getElementById('landing-input'),
            landingSend: document.getElementById('landing-send'),
            messageInput: document.getElementById('message-input'),
            sendButton: document.getElementById('send-button'),
            conversationArea: document.getElementById('conversation-area'),
            newChatBtn: document.getElementById('new-chat-btn'),
            charCount: document.getElementById('char-count'),
            navLogo: document.getElementById('nav-logo'),
            scrollIndicator: document.getElementById('scroll-indicator'),
            copyContractBtn: document.getElementById('copy-contract'),
            contractAddress: document.getElementById('contract-address')
        };

        this.setupEventListeners();
        this.connectWebSocket();
        this.updateCharCount();
        this.initBackgroundAnimation();
        this.setupScrollIndicator();
    }

    setupEventListeners() {
        // Landing page submit
        this.elements.landingSend.addEventListener('click', () => this.handleLandingSubmit());
        this.elements.landingInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleLandingSubmit();
            }
        });

        // Chat page submit
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textareas
        this.elements.landingInput.addEventListener('input', () => {
            this.autoResizeTextarea(this.elements.landingInput);
        });

        // Input character count
        this.elements.messageInput.addEventListener('input', () => {
            this.updateCharCount();
            this.autoResizeTextarea(this.elements.messageInput);
        });

        // New chat button
        this.elements.newChatBtn.addEventListener('click', () => this.startNewChat());

        // Navigation logo click - go back to landing
        this.elements.navLogo.addEventListener('click', () => this.goToLanding());

        // Copy contract address
        if (this.elements.copyContractBtn) {
            this.elements.copyContractBtn.addEventListener('click', () => this.copyContractAddress());
        }
    }

    setupScrollIndicator() {
        if (this.elements.scrollIndicator) {
            this.elements.scrollIndicator.addEventListener('click', () => {
                // Scroll to the first section below landing
                const firstSection = document.getElementById('what-is-evil-grok');
                if (firstSection) {
                    firstSection.scrollIntoView({ behavior: 'smooth' });
                }
            });

            // Hide scroll indicator when user scrolls down
            window.addEventListener('scroll', () => {
                if (window.scrollY > 100) {
                    this.elements.scrollIndicator.style.opacity = '0';
                } else {
                    this.elements.scrollIndicator.style.opacity = '1';
                }
            });
        }
    }

    async copyContractAddress() {
        try {
            const contractAddress = this.elements.contractAddress.value;
            await navigator.clipboard.writeText(contractAddress);
            
            // Show success notification
            this.showNotification('📋 Contract address copied to clipboard!', 'success');
            
            // Add visual feedback to button
            const originalIcon = this.elements.copyContractBtn.innerHTML;
            this.elements.copyContractBtn.innerHTML = '<i class="fas fa-check"></i>';
            this.elements.copyContractBtn.style.background = '#22c55e';
            
            // Reset button after 2 seconds
            setTimeout(() => {
                this.elements.copyContractBtn.innerHTML = originalIcon;
                this.elements.copyContractBtn.style.background = '';
            }, 2000);
            
        } catch (error) {
            console.error('Failed to copy contract address:', error);
            this.showNotification('❌ Failed to copy contract address. Please try again.', 'error');
        }
    }

    connectWebSocket() {
        try {
            // Connect to local server running on your computer
            // You'll need to update this URL when you set up ngrok
            const wsUrl = 'wss://5a2951e7572a.ngrok-free.app/ws/chat';
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.updateConnectionStatus('Connected', true);
            };

            this.ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.updateConnectionStatus('Disconnected', false);
                this.scheduleReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('Error', false);
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.scheduleReconnect();
        }
    }

    handleWebSocketMessage(data) {
        if (data.type === 'response') {
            this.hideThinking();
            this.addMessage('grok', data.content, 'gork-message');
            this.scrollToBottom();
        } else if (data.type === 'error') {
            this.hideThinking();
            this.addMessage('grok', 'Sorry, I encountered an error. Please try again.', 'gork-message');
            this.scrollToBottom();
        }
    }

    handleLandingSubmit() {
        const message = this.elements.landingInput.value.trim();
        if (message) {
            this.currentUserMessage = message;
        this.switchToChatView();
        this.sendWebSocketMessage(message);
        this.elements.landingInput.value = '';
        }
    }

    sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (message && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.currentUserMessage = message;
        this.sendWebSocketMessage(message);
        this.elements.messageInput.value = '';
            this.autoResizeTextarea(this.elements.messageInput);
        this.updateCharCount();
        this.updateSendButton();
        }
    }

    sendWebSocketMessage(content) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'message',
                content: content
            }));
            
            this.addMessage('user', content, 'user-message');
            this.showThinking();
            this.scrollToBottom();
        }
    }

    addMessage(author, content, messageClass = '') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${messageClass}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;
        
        const timeRow = document.createElement('div');
        timeRow.className = 'message-time-row';
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        timeRow.appendChild(timeSpan);
        
        // Add share button for Grok messages
        if (author === 'grok') {
            const shareButton = this.createShareButton({ question: this.currentUserMessage, answer: content });
            timeRow.appendChild(shareButton);
        }
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(timeRow);
        
        this.elements.conversationArea.appendChild(messageDiv);
    }

    createShareButton(messageData) {
        const shareButton = document.createElement('button');
        shareButton.className = 'share-button';
        shareButton.innerHTML = '<i class="fas fa-share"></i><span class="share-text">Share</span>';
        shareButton.addEventListener('click', () => this.shareOnTwitter(messageData));
        return shareButton;
    }

    async shareOnTwitter(messageData) {
        try {
            // Generate the card image
            const cardBlob = await this.generateEvilGrokCard(
                messageData.question || 'Chat with Evil Grok',
                messageData.answer
            );
            
            // Copy image to clipboard
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': cardBlob })
            ]);
            
            // Show instruction notification
            this.showNotification('📋 Evil Grok card copied! Paste in Twitter (Ctrl+V)', 'success');
            
            // Wait a moment for user to see the notification, then open Twitter
            setTimeout(() => {
                window.open('https://twitter.com/compose/tweet', '_blank');
            }, 1500);
            
        } catch (error) {
            console.error('Error sharing on Twitter:', error);
            this.showNotification('❌ Failed to copy image. Try again!', 'error');
        }
    }

    async generateEvilGrokCard(question, answer) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Card dimensions (Twitter optimized)
            canvas.width = 1200;
            canvas.height = 630;
            
            // Evil Grok themed background
            ctx.fillStyle = '#0a0000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add subtle red gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#0a0000');
            gradient.addColorStop(1, '#1a0505');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Load font and draw content
            this.drawEvilGrokCardContent(ctx, question, answer, () => {
                canvas.toBlob(resolve, 'image/png', 0.9);
            });
        });
    }

    drawEvilGrokCardContent(ctx, question, answer, callback) {
        // Load the logo image
        const logoImg = new Image();
        logoImg.onload = () => {
            // Draw Evil Grok logo
            ctx.drawImage(logoImg, 50, 50, 60, 60);
            
            // Draw "Evil Grok" text
            ctx.font = 'bold 28px Inter, Arial, sans-serif';
            ctx.fillStyle = '#ff3333';
            ctx.fillText('Evil Grok', 130, 90);
            
            // Draw question
            ctx.font = '24px Inter, Arial, sans-serif';
            ctx.fillStyle = '#ff6666';
            this.wrapText(ctx, `Q: ${question}`, 80, 180, 1040, 30);
            
            // Draw answer
            ctx.font = 'bold 28px Inter, Arial, sans-serif';
            ctx.fillStyle = '#ff3333';
            this.wrapText(ctx, `A: ${answer}`, 80, 280, 1040, 36);
            
            // Draw footer branding
            ctx.font = '18px Inter, Arial, sans-serif';
            ctx.fillStyle = '#cc4444';
            ctx.fillText('Generated by Evil Grok AI', 80, 580);
            
            // Draw hashtags
            ctx.fillStyle = '#ff6666';
            ctx.fillText('#EvilGrok #AI #ChaosMode', 800, 580);
            
            callback();
        };
        
        logoImg.onerror = () => {
            // Fallback to drawing simple logo if image fails to load
        ctx.beginPath();
        ctx.arc(80, 80, 30, 0, 2 * Math.PI);
            ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw cross inside circle
        ctx.beginPath();
        ctx.moveTo(65, 80);
        ctx.lineTo(95, 80);
        ctx.moveTo(80, 65);
        ctx.lineTo(80, 95);
        ctx.stroke();
        
            // Continue with text drawing
        ctx.font = 'bold 28px Inter, Arial, sans-serif';
            ctx.fillStyle = '#ff3333';
            ctx.fillText('Evil Grok', 130, 90);
        
        ctx.font = '24px Inter, Arial, sans-serif';
            ctx.fillStyle = '#ff6666';
        this.wrapText(ctx, `Q: ${question}`, 80, 180, 1040, 30);
        
        ctx.font = 'bold 28px Inter, Arial, sans-serif';
            ctx.fillStyle = '#ff3333';
        this.wrapText(ctx, `A: ${answer}`, 80, 280, 1040, 36);
        
        ctx.font = '18px Inter, Arial, sans-serif';
            ctx.fillStyle = '#cc4444';
            ctx.fillText('Generated by Evil Grok AI', 80, 580);
        
            ctx.fillStyle = '#ff6666';
            ctx.fillText('#EvilGrok #AI #ChaosMode', 800, 580);
        
        callback();
        };
        
        // Load the logo
        logoImg.src = 'logo-64px.png';
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
                
                // Stop if we're getting too long
                if (currentY > y + (lineHeight * 8)) {
                    ctx.fillText(line + '...', x, currentY);
                    break;
                }
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingToasts = document.querySelectorAll('.notification-toast');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `notification-toast ${type}`;
        
        const icon = document.createElement('i');
        if (type === 'success') {
            icon.className = 'fas fa-check-circle';
        } else if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
        } else {
            icon.className = 'fas fa-info-circle';
        }
        
        const text = document.createElement('span');
        text.textContent = message;
        
        toast.appendChild(icon);
        toast.appendChild(text);
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    showThinking() {
        this.isThinking = true;
        
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking-animation';
        thinkingDiv.id = 'thinking-animation';
        
        const thinkingLogo = document.createElement('img');
        thinkingLogo.src = 'logo-32px.png';
        thinkingLogo.alt = 'Evil Grok Logo';
        thinkingLogo.className = 'thinking-logo';
        
        const thinkingText = document.createElement('div');
        thinkingText.className = 'thinking-text';
        thinkingText.textContent = 'Evil Grok is plotting...';
        
        const loadingBar = document.createElement('div');
        loadingBar.className = 'loading-bar';
        
        thinkingDiv.appendChild(thinkingLogo);
        thinkingDiv.appendChild(thinkingText);
        thinkingDiv.appendChild(loadingBar);

        this.elements.conversationArea.appendChild(thinkingDiv);
        this.scrollToBottom();
    }

    hideThinking() {
        this.isThinking = false;
        const thinkingDiv = document.getElementById('thinking-animation');
        if (thinkingDiv) {
            thinkingDiv.remove();
        }
    }

    switchToChatView() {
        // Hide all landing page content
        this.elements.landingView.style.display = 'none';
        
        // Hide all info sections
        const infoSections = document.querySelectorAll('.info-section, .lore-section, .tokenomics-section, .cult-section');
        infoSections.forEach(section => {
            section.style.display = 'none';
        });
        
        // Show chat interface
        this.elements.chatView.style.display = 'flex';
        this.elements.inputArea.style.display = 'block';
        
        // Add class to body to indicate chat is active
        document.body.classList.add('chat-active');
        
        // Focus on message input
        setTimeout(() => {
            this.elements.messageInput.focus();
        }, 100);
        
        // Scroll to top of chat
        window.scrollTo(0, 0);
    }

    startNewChat() {
        // Clear conversation
        this.elements.conversationArea.innerHTML = '';
        
        // Focus on message input
        this.elements.messageInput.focus();
        
        // Reset input
        this.elements.messageInput.value = '';
        this.updateCharCount();
        this.updateSendButton();
        
        this.hideThinking();
    }

    updateConnectionStatus(status, isConnected) {
        // Could add connection status indicator here if needed
    }

    updateCharCount() {
            const count = this.elements.messageInput.value.length;
            this.elements.charCount.textContent = count;
        
        // Change color based on character count
        if (count > 250) {
            this.elements.charCount.style.color = '#ff6666';
        } else if (count > 200) {
            this.elements.charCount.style.color = '#ff9999';
        } else {
            this.elements.charCount.style.color = '#cc4444';
        }
    }

    updateSendButton() {
        const hasContent = this.elements.messageInput.value.trim().length > 0;
        const isConnected = this.ws && this.ws.readyState === WebSocket.OPEN;
        this.elements.sendButton.disabled = !hasContent || !isConnected;
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    scrollToBottom() {
        setTimeout(() => {
            // Scroll to the bottom of the page since body is the scrollable container
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }

    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            this.connectWebSocket();
            }, this.reconnectInterval);
        } else {
            console.error('Max reconnection attempts reached');
            this.updateConnectionStatus('Connection failed', false);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    goToLanding() {
        // Show all landing page content
        this.elements.landingView.style.display = 'flex';
        
        // Show all info sections
        const infoSections = document.querySelectorAll('.info-section, .lore-section, .tokenomics-section, .cult-section');
        infoSections.forEach(section => {
            section.style.display = 'flex';
        });
        
        // Hide chat interface
        this.elements.chatView.style.display = 'none';
        this.elements.inputArea.style.display = 'none';
        
        // Remove chat active class
        document.body.classList.remove('chat-active');
        
        // Clear landing input
        this.elements.landingInput.value = '';
        
        // Scroll to top of landing page
        window.scrollTo(0, 0);
        
        // Focus on landing input
        setTimeout(() => {
            this.elements.landingInput.focus();
        }, 100);
    }

    // Background Animation Initialization
    initBackgroundAnimation() {
        // Initialize floating particles background animation
        this.initParticles();
        
        // Other animation options (uncomment to use):
        // this.initGrid();
        // this.initScanner();
        // this.initBinaryRain();
        // this.initPulse();
    }

    initParticles() {
        const container = document.createElement('div');
        container.className = 'bg-particles';
        document.body.appendChild(container);

        for (let i = 0; i < 60; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 8 + 's';
            particle.style.animationDuration = (Math.random() * 4 + 6) + 's';
            container.appendChild(particle);
        }
    }

    initGrid() {
        const container = document.createElement('div');
        container.className = 'bg-grid';
        document.body.appendChild(container);
    }

    initScanner() {
        const container = document.createElement('div');
        container.className = 'bg-scanner';
        document.body.appendChild(container);

        const scannerLine = document.createElement('div');
        scannerLine.className = 'scanner-line';
        container.appendChild(scannerLine);
    }

    initBinaryRain() {
        const container = document.createElement('div');
        container.className = 'bg-binary';
        document.body.appendChild(container);

        const chars = '01';
        
        for (let i = 0; i < 20; i++) {
            const column = document.createElement('div');
            column.className = 'binary-column';
            column.style.left = Math.random() * 100 + '%';
            column.style.animationDuration = (Math.random() * 3 + 2) + 's';
            column.style.animationDelay = Math.random() * 2 + 's';
            
            let text = '';
            for (let j = 0; j < 20; j++) {
                text += chars[Math.floor(Math.random() * chars.length)] + '<br>';
            }
            column.innerHTML = text;
            
            container.appendChild(column);
        }
    }

    initPulse() {
        const container = document.createElement('div');
        container.className = 'bg-pulse';
        document.body.appendChild(container);
    }
}

// Initialize the chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
new GrokChat(); 
}); 
