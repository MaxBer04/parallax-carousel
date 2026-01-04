import { IndexAnimationSystem } from "./IndexAnimationSystem.js";
import { ImageZoomSystem } from "./ImageZoomSystem.js";
import { MiniSliderSystem } from "./MiniSliderSystem.js";
import { CrossAnimationSystem } from "./CrossAnimationSystem.js";
import { TitleAnimationSystem } from "./TitleAnimationSystem.js";

/**
 * ParallaxCarousel - A canvas-based parallax image carousel
 *
 * @class
 * @example
 * const carousel = new ParallaxCarousel({
 *   container: '#carousel',
 *   images: [
 *     { src: '/img1.jpg', title: 'Title 1', href: '/link1' },
 *     { src: '/img2.jpg', title: 'Title 2', href: '/link2' }
 *   ],
 *   features: { showIndex: true, showTitles: true },
 *   callbacks: { onImageClick: (index, image) => console.log(index) }
 * });
 */
export class ParallaxCarousel {
  /**
   * Default configuration
   */
  static defaultConfig = {
    container: "body",

    images: [],

    features: {
      showIndex: true,
      showTitles: true,
      enableZoom: true,
      enableKeyboard: true,
      enableWheel: true,
      enableDrag: true,
    },

    baseViewport: {
      width: 1728,
      height: 1000,
    },

    dimensions: {
      maskWidth: 378,
      maskHeight: 540,
      maskGap: 30,
      imageZoom: 1.25,
      imageBorderRadius: 4,
    },

    animations: {
      timingNormalizer: 16,
      minFrameRate: 32,
      offScreenBuffer: 100,
      dragSensitivity: 1,
      wheelSensitivity: 0.65,
      keyboardSensitivity: 50,
      minScrollThreshold: 0.0005,
      minDragThreshold: 20,
      baseDamping: 0.8,
      edgeDamping: 0.7,
      edgeZone: 0.5,
      maxVelocity: 400,
      minVelocity: 0.001,
      positionSmoothing: 0.075,
      parallaxStrength: 0.6,
      parallaxSmoothing: 0.9,
    },

    styling: {
      backgroundColor: "#141414",
      centerCrossColor: "#fdfdfddd",
      centerCrossLineWidth: 1.75,
      centerCrossLineLength: 11,
    },

    callbacks: {
      onImageClick: null,
      onZoomIn: null,
      onZoomOut: null,
      onSlide: null,
      onInit: null,
      onDestroy: null,
    },
  };

  constructor(userConfig = {}) {
    // Merge user config with defaults
    this.config = this.mergeConfig(ParallaxCarousel.defaultConfig, userConfig);

    // Validate configuration
    this.validateConfig();

    // Internal state
    this.state = {
      currentPosition: 0,
      smoothPosition: 0,
      velocity: 0,
      isPointerDown: false,
      isDragging: false,
      lastPointerX: 0,
      minScroll: 0,
      maxScroll: 0,
      targetPosition: null,
      toSliderStartTransforms: null,
      toMiniStartTransforms: null,
      currentTransforms: {
        images: [],
        masks: [],
      },
      isInitialized: false,
      isDestroyed: false,
    };

    this.images = [];
    this.canvas = null;
    this.ctx = null;
    this.container = null;
    this.titleContainer = null;

    // Animation systems
    this.indexAnimation = null;
    this.zoomSystem = null;
    this.miniSliderSystem = null;
    this.crossAnimation = null;
    this.titleAnimation = null;

    // Animation frame ID
    this.animationFrameId = null;

    // Initialize the carousel
    this.init();
  }

  /**
   * Deep merge configuration objects
   */
  mergeConfig(defaultConfig, userConfig) {
    const merged = { ...defaultConfig };

    for (const key in userConfig) {
      if (
        userConfig[key] &&
        typeof userConfig[key] === "object" &&
        !Array.isArray(userConfig[key])
      ) {
        merged[key] = this.mergeConfig(defaultConfig[key] || {}, userConfig[key]);
      } else {
        merged[key] = userConfig[key];
      }
    }

    return merged;
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    if (!this.config.images || this.config.images.length === 0) {
      throw new Error("ParallaxCarousel: images array is required and must not be empty");
    }

    // Validate each image has required properties
    this.config.images.forEach((img, index) => {
      if (!img.src) {
        throw new Error(`ParallaxCarousel: Image at index ${index} is missing 'src' property`);
      }
    });
  }

  /**
   * Initialize the carousel
   */
  async init() {
    if (this.state.isInitialized) {
      console.warn("ParallaxCarousel: Already initialized");
      return;
    }

    // Get or create container
    this.container =
      typeof this.config.container === "string"
        ? document.querySelector(this.config.container)
        : this.config.container;

    if (!this.container) {
      throw new Error(`ParallaxCarousel: Container not found: ${this.config.container}`);
    }

    // Add carousel container class for styling
    this.container.classList.add("parallax-carousel-container");

    // Calculate dimensions
    this.calculateDimensions();

    // Setup canvas
    this.setupCanvas();

    // Create title container if titles are enabled
    if (this.config.features.showTitles) {
      this.setupTitleContainer();
    }

    // Initialize animation systems
    this.initializeSystems();

    // Load images
    await this.loadImages();

    // Calculate boundaries
    this.calculateBoundaries();

    // Setup event listeners
    this.setupEventListeners();

    // Start animation loop
    this.startAnimation();

    this.state.isInitialized = true;

    // Call onInit callback
    if (this.config.callbacks.onInit) {
      this.config.callbacks.onInit(this);
    }
  }

  /**
   * Initialize animation systems
   */
  initializeSystems() {
    this.indexAnimation = new IndexAnimationSystem({ style: "clipped" });
    this.zoomSystem = new ImageZoomSystem();
    this.miniSliderSystem = new MiniSliderSystem();
    this.crossAnimation = new CrossAnimationSystem();

    if (this.config.features.showTitles) {
      this.titleAnimation = new TitleAnimationSystem();
    }

    this.crossAnimation.showCenter();
  }

  /**
   * Setup title container for title animations
   */
  setupTitleContainer() {
    this.titleContainer = document.createElement("ul");
    this.titleContainer.id = "title-list";
    this.titleContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      list-style: none;
      pointer-events: none;
    `;

    // Create title elements for each image
    this.config.images.forEach((image) => {
      const li = document.createElement("li");
      li.style.cssText = `
        position: absolute;
        left: 50%;
        top: calc(50% - 2.0833vw);
        transform: translateX(-50%);
      `;

      const titleDiv = document.createElement("div");
      titleDiv.className = "title";
      titleDiv.style.cssText = `
        font-size: 3.125vw;
        line-height: 4.2708vw;
        letter-spacing: 0.015em;
        overflow: hidden;
        pointer-events: none;
      `;

      const titleLink = document.createElement("a");
      titleLink.textContent = image.title || "";
      titleLink.href = image.href || "#";
      titleLink.style.cssText = `
        display: block;
        color: inherit;
        text-decoration: none;
        will-change: transform;
        font-weight: 300;
        user-select: none;
        transform: translate3d(0%, 100%, 0px);
      `;

      titleDiv.appendChild(titleLink);
      li.appendChild(titleDiv);
      this.titleContainer.appendChild(li);
    });

    this.container.appendChild(this.titleContainer);
  }

  /**
   * Calculate responsive dimensions
   */
  calculateDimensions() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const widthScale = viewportWidth / this.config.baseViewport.width;
    const heightScale = viewportHeight / this.config.baseViewport.height;
    const scale = Math.min(widthScale, heightScale);

    this.config.dimensionScale = scale;
    this.config.scaledDimensions = {
      maskWidth: Math.round(this.config.dimensions.maskWidth * scale),
      maskHeight: Math.round(this.config.dimensions.maskHeight * scale),
      maskGap: Math.round(this.config.dimensions.maskGap * scale),
      imageZoom: this.config.dimensions.imageZoom,
    };

    if (this.miniSliderSystem) {
      this.miniSliderSystem.calculateDimensions(scale);
    }
  }

  /**
   * Setup canvas element
   */
  setupCanvas() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.container.appendChild(this.canvas);
    this.resizeCanvas();
  }

  /**
   * Resize canvas to match viewport
   */
  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.scale(dpr, dpr);

    this.calculateDimensions();

    if (this.images.length) {
      this.images = this.images.map((img) => {
        const aspectRatio = img.element.width / img.element.height;
        const baseHeight = this.config.scaledDimensions.maskHeight;
        const baseWidth = baseHeight * aspectRatio;
        const scaledHeight = baseHeight * this.config.scaledDimensions.imageZoom;
        const scaledWidth = baseWidth * this.config.scaledDimensions.imageZoom;

        return {
          ...img,
          width: scaledWidth,
          height: scaledHeight,
        };
      });

      this.calculateBoundaries();
    }
  }

  /**
   * Load images
   */
  async loadImages() {
    const imagePromises = this.config.images.map((imageConfig, index) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = imageConfig.src;
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          const baseHeight = this.config.scaledDimensions.maskHeight;
          const baseWidth = baseHeight * aspectRatio;
          const scaledHeight = baseHeight * this.config.scaledDimensions.imageZoom;
          const scaledWidth = baseWidth * this.config.scaledDimensions.imageZoom;

          resolve({
            element: img,
            width: scaledWidth,
            height: scaledHeight,
            aspectRatio,
            config: imageConfig, // Store original config
          });
        };
        img.onerror = () => {
          console.error(`Failed to load image: ${imageConfig.src}`);
          resolve(null);
        };
      });
    });

    const loadedImages = await Promise.all(imagePromises);
    this.images = loadedImages.filter((img) => img !== null);

    if (this.zoomSystem) {
      this.zoomSystem.initStageSystem(this.images.length);
    }
  }

  /**
   * Calculate scroll boundaries
   */
  calculateBoundaries() {
    const totalWidth =
      (this.images.length - 1) *
      (this.config.scaledDimensions.maskWidth + this.config.scaledDimensions.maskGap);
    this.state.minScroll = 0;
    this.state.maxScroll = totalWidth;

    this.state.currentPosition = Math.max(
      this.state.minScroll,
      Math.min(this.state.maxScroll, this.state.currentPosition)
    );
    this.state.smoothPosition = this.state.currentPosition;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Bind event handlers to preserve 'this' context
    this.boundHandlers = {
      pointerDown: this.handlePointerDown.bind(this),
      pointerMove: this.handlePointerMove.bind(this),
      pointerUp: this.handlePointerUp.bind(this),
      wheel: this.handleWheel.bind(this),
      keyDown: this.handleKeyDown.bind(this),
      resize: null,
    };

    // Resize handler with debounce
    let resizeTimeout;
    this.boundHandlers.resize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => this.resizeCanvas(), 250);
    };

    if (this.config.features.enableDrag) {
      window.addEventListener("pointerdown", this.boundHandlers.pointerDown);
      window.addEventListener("pointermove", this.boundHandlers.pointerMove);
      window.addEventListener("pointerup", this.boundHandlers.pointerUp);
    }

    if (this.config.features.enableWheel) {
      window.addEventListener("wheel", this.boundHandlers.wheel, { passive: false });
    }

    if (this.config.features.enableKeyboard) {
      window.addEventListener("keydown", this.boundHandlers.keyDown);
    }

    window.addEventListener("resize", this.boundHandlers.resize);
  }

  // ========================================
  // EVENT HANDLERS
  // ========================================

  handlePointerDown(e) {
    this.state.isPointerDown = true;
    this.state.lastPointerX = e.clientX;
    this.state.velocity = 0;
  }

  handlePointerMove(e) {
    if (!this.state.isPointerDown) return;

    const deltaX = this.state.lastPointerX - e.clientX;
    if (this.checkDrag(deltaX)) {
      if (this.config.features.showTitles && this.titleAnimation) {
        this.titleAnimation.resetNextTitle();
      }
      this.state.isDragging = true;
      this.addVelocity(deltaX * this.config.animations.dragSensitivity);
      this.state.lastPointerX = e.clientX;

      if (this.zoomSystem.state.isActive && !this.zoomSystem.state.isZoomingOut) {
        this.zoomSystem.zoomOut();
        this.state.toSliderStartTransforms = {
          images: this.state.currentTransforms.images.map((rect) => ({ ...rect })),
          masks: this.state.currentTransforms.masks.map((rect) => ({ ...rect })),
        };
        this.miniSliderSystem.toSlider();
        if (this.config.features.showTitles && this.titleAnimation) {
          this.titleAnimation.hideTitle();
        }
      }
    }
  }

  handlePointerUp(e) {
    if (!this.state.isDragging) {
      // Handle clicking in fullscreen mode
      if (this.zoomSystem.isActive()) {
        if (!this.zoomSystem.state.isZoomingOut) {
          for (let i = 0; i < this.state.currentTransforms.masks.length; i++) {
            if (this.isPointInRect(e.clientX, e.clientY, this.state.currentTransforms.masks[i])) {
              if (this.config.features.showTitles && this.titleAnimation) {
                this.titleAnimation.hideTitle();
              }
              if (i < this.zoomSystem.state.imageIndex) {
                this.crossAnimation.rotateSideCrosses(-1);
              } else if (i > this.zoomSystem.state.imageIndex) {
                this.crossAnimation.rotateSideCrosses(1);
              }
              this.zoomSystem.jumpToImage(i);
              this.updateTargetPosition(i);
              if (this.config.features.showTitles && this.titleAnimation) {
                this.titleAnimation.setNextTitle(i);
              }
              this.state.isDragging = false;
              this.state.isPointerDown = false;
              return;
            }
          }
        }

        if (e.clientX < window.innerWidth / 2) {
          const newIndex = this.zoomSystem.state.imageIndex - 1;
          this.slideLeft(newIndex);
        } else {
          const newIndex = this.zoomSystem.state.imageIndex + 1;
          this.slideRight(newIndex);
        }
      }

      // Handle 'normal' clicks for zooming to fullscreen mode
      const imageIndex = this.getImageIndexAtPoint(e.clientX, e.clientY);

      if (imageIndex !== -1 && !this.zoomSystem.state.isZoomingIn) {
        // Call custom callback if provided
        if (this.config.callbacks.onImageClick) {
          const shouldZoom = this.config.callbacks.onImageClick(
            imageIndex,
            this.images[imageIndex]
          );
          if (shouldZoom === false) {
            this.state.isDragging = false;
            this.state.isPointerDown = false;
            return; // Callback prevented default zoom behavior
          }
        }

        this.updateTargetPosition(imageIndex);

        if (this.config.features.enableZoom) {
          this.zoomSystem.zoomIn(imageIndex);
          if (!this.state.currentTransforms.images.length) this.setupTransformations();
          this.state.toMiniStartTransforms = {
            images: this.state.currentTransforms.images.map((rect) => ({ ...rect })),
            masks: this.state.currentTransforms.masks.map((rect) => ({ ...rect })),
          };
          this.miniSliderSystem.toMini(imageIndex);
          if (this.config.features.showTitles && this.titleAnimation) {
            this.titleAnimation.showTitle(imageIndex);
          }
          this.crossAnimation.resetRotation();

          if (this.config.callbacks.onZoomIn) {
            this.config.callbacks.onZoomIn(imageIndex);
          }
        }
      }
    }

    this.state.isDragging = false;
    this.state.isPointerDown = false;
  }

  handleWheel(e) {
    e.preventDefault();
    if (this.config.features.showTitles && this.titleAnimation) {
      this.titleAnimation.resetNextTitle();
    }
    this.state.targetPosition = null;

    if (this.zoomSystem.state.isActive) {
      if (
        !this.zoomSystem.state.isZoomingOut &&
        (this.checkScroll(e.deltaY) || this.checkScroll(e.deltaX))
      ) {
        this.zoomSystem.zoomOut();
        this.state.toSliderStartTransforms = {
          images: this.state.currentTransforms.images.map((rect) => ({ ...rect })),
          masks: this.state.currentTransforms.masks.map((rect) => ({ ...rect })),
        };
        this.miniSliderSystem.toSlider();
        if (this.config.features.showTitles && this.titleAnimation) {
          this.titleAnimation.hideTitle();
        }

        if (this.config.callbacks.onZoomOut) {
          this.config.callbacks.onZoomOut(this.zoomSystem.state.imageIndex);
        }
      }

      if (this.zoomSystem.state.isZoomingOut) {
        const delta = (e.deltaX + e.deltaY) * this.config.animations.wheelSensitivity;
        this.addVelocity(delta);
      }
    } else {
      const delta = (e.deltaX + e.deltaY) * this.config.animations.wheelSensitivity;
      this.addVelocity(delta);
    }
  }

  handleKeyDown(e) {
    switch (e.key) {
      case "ArrowDown":
      case "Down":
      case "ArrowLeft":
      case "Left":
        e.preventDefault();
        if (this.miniSliderSystem.isInToMiniMode()) {
          const newIndex = this.zoomSystem.state.imageIndex - 1;
          this.slideLeft(newIndex);
        } else {
          this.addVelocity(-this.config.animations.keyboardSensitivity);
        }
        break;
      case "ArrowUp":
      case "Up":
      case "ArrowRight":
      case "Right":
        e.preventDefault();
        if (this.miniSliderSystem.isInToMiniMode()) {
          const newIndex = this.zoomSystem.state.imageIndex + 1;
          this.slideRight(newIndex);
        } else {
          this.addVelocity(this.config.animations.keyboardSensitivity);
        }
        break;
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  expDecay(start, end, decay, progress) {
    return start + (end - start) * (1 - Math.exp(-decay * progress));
  }

  isPointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  checkScroll(delta) {
    return Math.abs(delta) > this.config.animations.minScrollThreshold;
  }

  checkDrag(delta) {
    return Math.abs(delta) > this.config.animations.minDragThreshold;
  }

  addVelocity(amount) {
    this.state.velocity += amount;
    this.state.velocity = Math.max(
      -this.config.animations.maxVelocity,
      Math.min(this.config.animations.maxVelocity, this.state.velocity)
    );
  }

  setupTransformations() {
    this.images.forEach((img, index) => {
      this.state.currentTransforms.images.push(this.getImageRect(index));
      this.state.currentTransforms.masks.push(this.getMaskRect(index));
    });
  }

  updateTargetPosition(imageIndex) {
    const viewportCenter = window.innerWidth / 2;
    const maskX =
      viewportCenter -
      this.config.scaledDimensions.maskWidth / 2 +
      imageIndex * (this.config.scaledDimensions.maskWidth + this.config.scaledDimensions.maskGap) -
      this.state.smoothPosition;
    const centeredX = viewportCenter - this.config.scaledDimensions.maskWidth / 2;
    const moveDistance = maskX - centeredX;

    this.state.targetPosition = this.state.currentPosition + moveDistance;
  }

  slideRight(newIndex) {
    if (newIndex < this.images.length) {
      if (this.config.features.showTitles && this.titleAnimation) {
        this.titleAnimation.hideTitle();
      }
      this.zoomSystem.transitionToImage(newIndex);
      this.updateTargetPosition(newIndex);
      if (this.config.features.showTitles && this.titleAnimation) {
        this.titleAnimation.setNextTitle(newIndex);
      }
      this.crossAnimation.rotateSideCrosses(1);

      if (this.config.callbacks.onSlide) {
        this.config.callbacks.onSlide(this.zoomSystem.state.imageIndex, newIndex);
      }
    }
  }

  slideLeft(newIndex) {
    if (newIndex >= 0) {
      if (this.config.features.showTitles && this.titleAnimation) {
        this.titleAnimation.hideTitle();
      }
      this.zoomSystem.transitionToImage(newIndex);
      this.updateTargetPosition(newIndex);
      if (this.config.features.showTitles && this.titleAnimation) {
        this.titleAnimation.setNextTitle(newIndex);
      }
      this.crossAnimation.rotateSideCrosses(-1);

      if (this.config.callbacks.onSlide) {
        this.config.callbacks.onSlide(this.zoomSystem.state.imageIndex, newIndex);
      }
    }
  }

  getImageIndexAtPoint(x, y) {
    const centerY = window.innerHeight / 2;
    const centerX = window.innerWidth / 2;

    for (let i = 0; i < this.images.length; i++) {
      const maskX =
        centerX -
        this.config.scaledDimensions.maskWidth / 2 +
        i * (this.config.scaledDimensions.maskWidth + this.config.scaledDimensions.maskGap) -
        this.state.smoothPosition;

      if (
        x >= maskX &&
        x <= maskX + this.config.scaledDimensions.maskWidth &&
        y >= centerY - this.config.scaledDimensions.maskHeight / 2 &&
        y <= centerY + this.config.scaledDimensions.maskHeight / 2
      ) {
        return i;
      }
    }
    return -1;
  }

  getImageRect(index) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const maskX =
      centerX -
      this.config.scaledDimensions.maskWidth / 2 +
      index * (this.config.scaledDimensions.maskWidth + this.config.scaledDimensions.maskGap) -
      this.state.smoothPosition;

    const img = this.images[index];
    const extraWidth = img.width - this.config.scaledDimensions.maskWidth;

    const maskCenter = maskX + this.config.scaledDimensions.maskWidth / 2;
    const distanceFromCenter = (maskCenter - centerX) / (window.innerWidth / 2);
    const parallaxOffset =
      (extraWidth / 2) * distanceFromCenter * this.config.animations.parallaxStrength;

    return {
      x: maskX - extraWidth / 2 - parallaxOffset,
      y: centerY - img.height / 2,
      width: img.width,
      height: img.height,
    };
  }

  getMaskRect(index) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const maskX =
      centerX -
      this.config.scaledDimensions.maskWidth / 2 +
      index * (this.config.scaledDimensions.maskWidth + this.config.scaledDimensions.maskGap) -
      this.state.smoothPosition;

    return {
      x: maskX,
      y: centerY - this.config.scaledDimensions.maskHeight / 2,
      width: this.config.scaledDimensions.maskWidth,
      height: this.config.scaledDimensions.maskHeight,
    };
  }

  getFullscreenRect(image) {
    const viewportRatio = window.innerWidth / window.innerHeight;
    const imageRatio = image.width / image.height;

    let width, height;
    if (viewportRatio > imageRatio) {
      width = window.innerWidth;
      height = window.innerWidth / imageRatio;
    } else {
      height = window.innerHeight;
      width = window.innerHeight * imageRatio;
    }

    return {
      x: (window.innerWidth - width) / 2,
      y: (window.innerHeight - height) / 2,
      width,
      height,
    };
  }

  interpolateRects(current, target, progress, decay = 16) {
    return {
      x: this.expDecay(current.x, target.x, decay, progress),
      y: this.expDecay(current.y, target.y, decay, progress),
      width: this.expDecay(current.width, target.width, decay, progress),
      height: this.expDecay(current.height, target.height, decay, progress),
    };
  }

  // ========================================
  // ANIMATION & RENDERING
  // ========================================

  updateMotion(deltaTime) {
    const dt = deltaTime / this.config.animations.timingNormalizer;

    if (this.zoomSystem.state.isActive) {
      this.zoomSystem.updateAnimation(dt);
      this.miniSliderSystem.updateAnimation(dt);
    } else {
      if (this.miniSliderSystem.isActive()) {
        this.miniSliderSystem.setInactive();
      }
    }

    if (this.miniSliderSystem.isInToMiniMode() && !this.crossAnimation.isInToMiniMode()) {
      this.crossAnimation.hideCenter();
    } else if (
      this.miniSliderSystem.isInToSliderMode() &&
      !this.crossAnimation.isInToSliderMode()
    ) {
      this.crossAnimation.showCenter();
    }

    this.crossAnimation.updateAnimation(dt);
    if (this.config.features.showTitles && this.titleAnimation) {
      this.titleAnimation.updateAnimation(dt);
    }
    this.updateSliderMotion(dt);
  }

  updateSliderMotion(dt) {
    const distanceToMin = this.state.currentPosition - this.state.minScroll;
    const distanceToMax = this.state.maxScroll - this.state.currentPosition;
    const range = this.state.maxScroll - this.state.minScroll;
    const edgeZone = range * this.config.animations.edgeZone;

    if (this.state.targetPosition !== null) {
      const distanceToTarget = this.state.targetPosition - this.state.currentPosition;

      if (Math.abs(distanceToTarget) < 0.1) {
        this.state.currentPosition = this.state.targetPosition;
        this.state.targetPosition = null;
        this.state.velocity = 0;
      } else {
        this.state.velocity = this.config.animations.positionSmoothing * distanceToTarget;
      }
    }

    let damping = this.config.animations.baseDamping;
    if (
      (distanceToMin < edgeZone && this.state.velocity < 0) ||
      (distanceToMax < edgeZone && this.state.velocity > 0)
    ) {
      const edgeDistance = this.state.velocity < 0 ? distanceToMin : distanceToMax;
      const edgeFactor = Math.max(0, edgeDistance / edgeZone);
      damping = this.expDecay(
        this.config.animations.edgeDamping,
        this.config.animations.baseDamping,
        1,
        edgeFactor
      );
    }

    this.state.velocity *= Math.pow(damping, dt);

    if (
      Math.abs(this.state.velocity) > this.config.animations.minVelocity ||
      this.state.targetPosition !== null
    ) {
      let newPosition = this.state.currentPosition + this.state.velocity * dt;

      if (newPosition < this.state.minScroll) {
        newPosition = this.state.minScroll;
        this.state.velocity = 0;
        this.state.targetPosition = null;
      } else if (newPosition > this.state.maxScroll) {
        newPosition = this.state.maxScroll;
        this.state.velocity = 0;
        this.state.targetPosition = null;
      }

      this.state.currentPosition = newPosition;
    }

    this.state.smoothPosition = this.expDecay(
      this.state.smoothPosition,
      this.state.currentPosition,
      this.config.animations.positionSmoothing,
      dt
    );
  }

  render() {
    this.ctx.fillStyle = this.config.styling.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.images.length === 0) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    if (this.zoomSystem.isActive()) {
      this.renderZoomedImage(this.zoomSystem.state.imageIndex);
    } else {
      this.renderMainCarousel();
    }

    if (this.miniSliderSystem.isActive()) {
      this.renderMiniSlider();
    }

    if (this.crossAnimation.isActive()) {
      this.crossAnimation.render(this.ctx, centerX, centerY);
    }

    if (this.config.features.showIndex) {
      this.indexAnimation.updateIndex(
        this.state.smoothPosition,
        this.config.scaledDimensions.maskWidth,
        this.config.scaledDimensions.maskGap
      );
      this.indexAnimation.render(this.ctx, centerX, window.innerHeight - 50, this.images.length);
    }
  }

  renderMainCarousel() {
    this.images.forEach((img, index) => {
      const maskRect = this.getMaskRect(index);

      if (
        maskRect.x + this.config.scaledDimensions.maskWidth <
          -this.config.animations.offScreenBuffer ||
        maskRect.x > window.innerWidth + this.config.animations.offScreenBuffer
      ) {
        return;
      }

      this.renderImage(img, index);
    });
  }

  renderImage(img, index, override = null) {
    const maskRect = override?.mask || this.getMaskRect(index);
    const imageRect = override?.image || this.getImageRect(index);

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.roundRect(
      maskRect.x,
      maskRect.y,
      maskRect.width,
      maskRect.height,
      this.config.dimensions.imageBorderRadius
    );
    this.ctx.clip();

    this.ctx.drawImage(img.element, imageRect.x, imageRect.y, imageRect.width, imageRect.height);
    this.ctx.restore();
  }

  renderZoomedImage(zoomedImageIndex) {
    const image = this.images[zoomedImageIndex];
    const imageRect = this.getImageRect(zoomedImageIndex);
    const maskRect = this.getMaskRect(zoomedImageIndex);
    this.zoomSystem.render(this.ctx, image, imageRect, maskRect, this.images);
  }

  renderMiniSlider() {
    this.images.forEach((img, index) => {
      const progress = this.miniSliderSystem.getProgress(index, this.images.length);
      const absProgress = Math.abs(progress);

      const miniTarget = this.miniSliderSystem.getMiniTarget(
        index,
        this.images.length,
        img.width / img.height
      );
      const miniZoomedStart = {
        ...miniTarget,
        y: window.innerHeight + 2 * miniTarget.miniHeight,
      };

      if (this.miniSliderSystem.isInToMiniMode() || progress < 0) {
        this.state.currentTransforms.images[index] = this.interpolateRects(
          index === this.zoomSystem.state.imageIndex
            ? miniZoomedStart
            : this.state.toMiniStartTransforms.images[index],
          miniTarget,
          index === this.zoomSystem.state.imageIndex
            ? absProgress
            : Math.min(absProgress * 1.25, 1),
          index === this.zoomSystem.state.imageIndex ? 10 : 13
        );
        this.state.currentTransforms.masks[index] = this.interpolateRects(
          index === this.zoomSystem.state.imageIndex
            ? miniZoomedStart
            : this.state.toMiniStartTransforms.masks[index],
          miniTarget,
          index === this.zoomSystem.state.imageIndex
            ? absProgress
            : Math.min(absProgress * 1.25, 1),
          index === this.zoomSystem.state.imageIndex ? 11 : 14
        );
      } else {
        this.state.currentTransforms.images[index] = this.interpolateRects(
          this.state.toSliderStartTransforms.images[index],
          this.getImageRect(index),
          absProgress,
          13
        );
        this.state.currentTransforms.masks[index] = this.interpolateRects(
          this.state.toSliderStartTransforms.masks[index],
          this.getMaskRect(index),
          absProgress,
          12
        );
      }

      if (
        index === this.zoomSystem.state.imageIndex &&
        (this.miniSliderSystem.isInToSliderMode() || progress < 0)
      ) {
        const zoomedProgress = Math.max(
          0,
          this.miniSliderSystem.getProgress(0, this.images.length)
        );
        this.renderImage(img, index, {
          image: this.interpolateRects(
            this.state.toSliderStartTransforms.images[index],
            miniZoomedStart,
            zoomedProgress,
            6
          ),
          mask: this.interpolateRects(
            this.state.toSliderStartTransforms.masks[index],
            miniZoomedStart,
            zoomedProgress,
            6
          ),
        });
      } else {
        this.renderImage(img, index, {
          image: this.state.currentTransforms.images[index],
          mask: this.state.currentTransforms.masks[index],
        });
      }
    });
  }

  startAnimation() {
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let lastTimestamp = performance.now();

    const animate = (timestamp) => {
      frameCount++;
      if (timestamp - lastFpsUpdate > 1000) {
        frameCount = 0;
        lastFpsUpdate = timestamp;
      }

      const deltaTime = Math.min(timestamp - lastTimestamp, this.config.animations.minFrameRate);
      lastTimestamp = timestamp;

      this.updateMotion(deltaTime);
      this.render();

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  // ========================================
  // PUBLIC API METHODS
  // ========================================

  /**
   * Navigate to a specific image by index
   * @param {number} index - Image index to navigate to
   */
  goToImage(index) {
    if (index < 0 || index >= this.images.length) {
      console.warn(`ParallaxCarousel: Invalid image index ${index}`);
      return;
    }

    this.updateTargetPosition(index);

    if (this.zoomSystem.isActive()) {
      this.zoomSystem.transitionToImage(index);
    }
  }

  /**
   * Get current image index
   * @returns {number} Current image index
   */
  getCurrentIndex() {
    if (this.zoomSystem.isActive()) {
      return this.zoomSystem.state.imageIndex;
    }

    // Calculate from position
    const position = this.state.smoothPosition;
    const imageWidth =
      this.config.scaledDimensions.maskWidth + this.config.scaledDimensions.maskGap;
    return Math.round(position / imageWidth);
  }

  /**
   * Update carousel configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = this.mergeConfig(this.config, newConfig);
    this.calculateDimensions();
    this.resizeCanvas();
  }

  /**
   * Destroy the carousel and cleanup
   */
  destroy() {
    if (this.state.isDestroyed) {
      return;
    }

    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Remove event listeners
    if (this.boundHandlers) {
      window.removeEventListener("pointerdown", this.boundHandlers.pointerDown);
      window.removeEventListener("pointermove", this.boundHandlers.pointerMove);
      window.removeEventListener("pointerup", this.boundHandlers.pointerUp);
      window.removeEventListener("wheel", this.boundHandlers.wheel);
      window.removeEventListener("keydown", this.boundHandlers.keyDown);
      window.removeEventListener("resize", this.boundHandlers.resize);
    }

    // Remove DOM elements
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    if (this.titleContainer && this.titleContainer.parentNode) {
      this.titleContainer.parentNode.removeChild(this.titleContainer);
    }

    // Remove carousel container class
    if (this.container) {
      this.container.classList.remove("parallax-carousel-container");
    }

    this.state.isDestroyed = true;

    if (this.config.callbacks.onDestroy) {
      this.config.callbacks.onDestroy(this);
    }
  }

  // Additional methods will be added in part 2...
}
