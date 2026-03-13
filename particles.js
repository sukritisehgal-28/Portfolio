/**
 * Particle Constellation System
 * Creates an animated starfield with connecting lines
 */

class ParticleConstellation {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: null, y: null, radius: 150 };
    this.animationId = null;
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    this.config = {
      particleCount: 80,
      particleMinRadius: 1,
      particleMaxRadius: 2.5,
      connectionDistance: 120,
      mouseRepelDistance: 100,
      speed: 0.3,
      colors: {
        particle: 'rgba(139, 92, 246, 0.8)',
        particleGlow: 'rgba(139, 92, 246, 0.4)',
        connection: 'rgba(139, 92, 246, 0.15)',
        connectionHover: 'rgba(6, 182, 212, 0.3)'
      }
    };
    
    this.init();
  }
  
  init() {
    this.resize();
    this.createParticles();
    this.bindEvents();
    
    if (!this.isReducedMotion) {
      this.animate();
    } else {
      this.drawStatic();
    }
  }
  
  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.scale(dpr, dpr);
    
    // Adjust particle count based on screen size
    const area = window.innerWidth * window.innerHeight;
    this.config.particleCount = Math.min(100, Math.floor(area / 15000));
  }
  
  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * this.config.speed,
        vy: (Math.random() - 0.5) * this.config.speed,
        radius: Math.random() * (this.config.particleMaxRadius - this.config.particleMinRadius) + this.config.particleMinRadius,
        opacity: Math.random() * 0.5 + 0.5,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }
  
  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.createParticles();
    });
    
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    
    window.addEventListener('mouseout', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }
  
  animate() {
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    
    // Update and draw particles
    this.particles.forEach((particle, i) => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Twinkle effect
      particle.twinkle += 0.02;
      const twinkleOpacity = particle.opacity * (0.7 + Math.sin(particle.twinkle) * 0.3);
      
      // Wrap around edges
      if (particle.x < 0) particle.x = window.innerWidth;
      if (particle.x > window.innerWidth) particle.x = 0;
      if (particle.y < 0) particle.y = window.innerHeight;
      if (particle.y > window.innerHeight) particle.y = 0;
      
      // Mouse repulsion
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = particle.x - this.mouse.x;
        const dy = particle.y - this.mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.config.mouseRepelDistance) {
          const force = (this.config.mouseRepelDistance - distance) / this.config.mouseRepelDistance;
          particle.x += dx * force * 0.02;
          particle.y += dy * force * 0.02;
        }
      }
      
      // Draw particle glow
      const gradient = this.ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.radius * 3
      );
      gradient.addColorStop(0, `rgba(139, 92, 246, ${twinkleOpacity * 0.5})`);
      gradient.addColorStop(1, 'transparent');
      
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius * 3, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
      
      // Draw particle core
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${twinkleOpacity})`;
      this.ctx.fill();
      
      // Draw connections
      for (let j = i + 1; j < this.particles.length; j++) {
        const other = this.particles[j];
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.config.connectionDistance) {
          const opacity = (1 - distance / this.config.connectionDistance) * 0.3;
          
          // Check if mouse is near the connection
          let connectionColor = `rgba(139, 92, 246, ${opacity})`;
          if (this.mouse.x !== null && this.mouse.y !== null) {
            const midX = (particle.x + other.x) / 2;
            const midY = (particle.y + other.y) / 2;
            const mouseDistance = Math.sqrt(
              (midX - this.mouse.x) ** 2 + (midY - this.mouse.y) ** 2
            );
            if (mouseDistance < 100) {
              connectionColor = `rgba(6, 182, 212, ${opacity * 1.5})`;
            }
          }
          
          this.ctx.beginPath();
          this.ctx.moveTo(particle.x, particle.y);
          this.ctx.lineTo(other.x, other.y);
          this.ctx.strokeStyle = connectionColor;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    });
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  drawStatic() {
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    
    this.particles.forEach((particle) => {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
      this.ctx.fill();
    });
  }
  
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ParticleConstellation('particle-canvas');
});
