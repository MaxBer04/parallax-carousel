# @maxbertram/parallax-carousel

A canvas-based parallax image carousel with smooth animations, zoom functionality, and extensive customization options.

## Features

- 🎨 Canvas-based rendering for optimal performance
- 🖱️ Smooth parallax scrolling effect
- 🔍 Built-in zoom functionality
- ⌨️ Keyboard, mouse, and touch support
- 📱 Fully responsive
- 🎛️ Highly configurable
- 🪝 Callback system for custom behaviors
- 🎭 Optional title animations
- 📊 Optional index counter display

## Installation

```bash
npm install @maxbertram/parallax-carousel
```

Or with yarn:
```bash
yarn add @maxbertram/parallax-carousel
```

## Basic Usage

```javascript
import { ParallaxCarousel } from '@maxbertram/parallax-carousel';
import '@maxbertram/parallax-carousel/dist/carousel.css';

const carousel = new ParallaxCarousel({
  container: '#carousel-container',
  images: [
    { src: '/images/1.jpg', title: 'Image 1', href: '/page1' },
    { src: '/images/2.jpg', title: 'Image 2', href: '/page2' },
    { src: '/images/3.jpg', title: 'Image 3', href: '/page3' },
  ]
});
```

### HTML Setup

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Carousel</title>
</head>
<body>
  <div id="carousel-container" class="parallax-carousel-container"></div>
  <script type="module" src="/main.js"></script>
</body>
</html>
```

## Configuration Options

### Complete Configuration Example

```javascript
const carousel = new ParallaxCarousel({
  // Container element (selector string or DOM element)
  container: '#carousel-container',

  // Image configuration (REQUIRED)
  images: [
    {
      src: '/path/to/image.jpg',  // Required
      title: 'Image Title',        // Optional
      href: '/link',               // Optional
    }
  ],

  // Feature toggles
  features: {
    showIndex: true,        // Show image counter
    showTitles: true,       // Show image titles
    enableZoom: true,       // Enable click-to-zoom
    enableKeyboard: true,   // Enable keyboard navigation
    enableWheel: true,      // Enable wheel/trackpad scrolling
    enableDrag: true,       // Enable drag/swipe
  },

  // Viewport reference for responsive scaling
  baseViewport: {
    width: 1728,   // Reference viewport width
    height: 1000,  // Reference viewport height
  },

  // Carousel dimensions (scaled responsively)
  dimensions: {
    maskWidth: 378,          // Image mask width
    maskHeight: 540,         // Image mask height
    maskGap: 30,             // Gap between images
    imageZoom: 1.25,         // Zoom factor for images
    imageBorderRadius: 4,    // Border radius for image masks
  },

  // Animation parameters
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

  // Styling
  styling: {
    backgroundColor: '#141414',
    centerCrossColor: '#fdfdfddd',
    centerCrossLineWidth: 1.75,
    centerCrossLineLength: 11,
  },

  // Callbacks for custom behavior
  callbacks: {
    onImageClick: (index, image) => {
      console.log('Image clicked:', index);
      // Return false to prevent default zoom behavior
      // return false;
    },
    onZoomIn: (index) => {
      console.log('Zoomed in to image:', index);
    },
    onZoomOut: (index) => {
      console.log('Zoomed out from image:', index);
    },
    onSlide: (fromIndex, toIndex) => {
      console.log(`Slid from ${fromIndex} to ${toIndex}`);
    },
    onInit: (carousel) => {
      console.log('Carousel initialized');
    },
    onDestroy: (carousel) => {
      console.log('Carousel destroyed');
    },
  }
});
```

## Public API

### Methods

#### `goToImage(index)`
Navigate to a specific image by index.

```javascript
carousel.goToImage(2); // Go to third image (0-indexed)
```

#### `getCurrentIndex()`
Get the current image index.

```javascript
const currentIndex = carousel.getCurrentIndex();
```

#### `updateConfig(newConfig)`
Update carousel configuration dynamically.

```javascript
carousel.updateConfig({
  animations: {
    parallaxStrength: 0.8  // Increase parallax effect
  }
});
```

#### `destroy()`
Destroy the carousel and clean up resources.

```javascript
carousel.destroy();
```

## Advanced Usage Examples

### Custom Click Behavior (Navigate to Article)

```javascript
const carousel = new ParallaxCarousel({
  images: [
    { src: '/img1.jpg', title: 'Project One', href: '/articles/1' },
    { src: '/img2.jpg', title: 'Project Two', href: '/articles/2' },
  ],
  callbacks: {
    onImageClick: (index, image) => {
      // Navigate to article page instead of zooming
      window.location.href = image.config.href;
      return false; // Prevent default zoom
    }
  }
});
```

### Disable Features Selectively

```javascript
const carousel = new ParallaxCarousel({
  images: [...],
  features: {
    showIndex: false,      // Hide counter
    showTitles: true,      // Keep titles
    enableZoom: false,     // Disable zoom (carousel only)
  }
});
```

### Dynamic Image Loading

```javascript
// Start with initial images
const carousel = new ParallaxCarousel({
  container: '#carousel',
  images: initialImages
});

// Later, update with new images
carousel.destroy();
const newCarousel = new ParallaxCarousel({
  container: '#carousel',
  images: newImages
});
```

## Image Requirements

For optimal parallax effect:
- **Aspect Ratio**: Images should ideally be **landscape** (approximately 2:1 ratio, e.g., 2200x1080)
- **Quality**: Use high-resolution images for best visual quality
- **Format**: JPEG or PNG
- **Size**: Optimize file sizes for web (recommend < 500KB per image)

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## TypeScript Support

TypeScript definitions will be included in a future release.

## License

MIT © Max Bertram

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Credits

Inspired by the carousel implementation on camillemormal.com
