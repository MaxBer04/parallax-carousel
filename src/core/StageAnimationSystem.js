export class StageAnimationSystem {
  constructor(nImages) {
    this.params = {
      imageSmoothing: 0.4,
      maskSmoothing: 0.4,
      minThreshold: 0.00001,
    };

    this.state = {
      stages: [], // Array of stage objects tracking images and their states
      renderOrder: [],
      currentIndex: null,
      isTransitioning: false,
      isJumpTransition: false,
    };

    this.initialize(nImages);
  }

  initialize(nImages) {
    this.state.stages = [...Array(nImages)].map((_, index) => {
      return {
        imageIndex: index,
        image: {
          offset: 0,
          targetOffset: 0,
        },
        mask: {
          offset: 0,
          targetOffset: 0,
        },
      };
    });
    this.state.renderOrder = Array.from({ length: nImages }, (_, i) => i);
  }

  updateRenderOrder(currentIndex) {
    const totalLength = this.state.stages.length;

    // Get the elements before the current index in reverse order
    const beforeElements = Array.from({ length: currentIndex }, (_, i) => i).reverse();

    // Get the elements after the current index in original order
    const afterElements = Array.from(
      { length: totalLength - currentIndex - 1 },
      (_, i) => currentIndex + 1 + i
    );

    // Combine all parts
    this.state.renderOrder = [currentIndex, ...beforeElements, ...afterElements];
  }

  // Initialize a new fullscreen transition
  // targetOffset: Either -0.5, 0 or 0.5 (left out, centered, right out)
  initializeStage(imageIndex) {
    this.state.stages.forEach((stage, index) => {
      if (index < imageIndex) {
        stage.image = {
          offset: -0.5,
          targetOffset: -0.5,
        };
        stage.mask = {
          offset: -1,
          targetOffset: -1,
        };
      } else if (index > imageIndex) {
        stage.image = {
          offset: 0.5,
          targetOffset: 0.5,
        };
        stage.mask = {
          offset: 1,
          targetOffset: 1,
        };
      } else {
        stage.image = {
          offset: 0,
          targetOffset: 0,
        };
        stage.mask = {
          offset: 0,
          targetOffset: 0,
        };
      }
    });

    this.state.currentIndex = imageIndex;
    this.state.isTransitioning = false;
    this.updateRenderOrder(imageIndex);
  }

  jumpToImage(newIndex) {
    if (newIndex === this.state.currentIndex) return;

    this.state.isJumpTransition = true;
    this.transitionTo(newIndex);
  }

  // Start transition to new image
  transitionTo(newIndex) {
    if (newIndex === this.state.currentIndex) return;

    // Handle jump transitions (mini image clicks)
    if (this.state.isJumpTransition) {
      this.state.stages.forEach((stage, idx) => {
        if (idx === newIndex) {
          // Target image moves to center
          stage.image.targetOffset = 0;
          stage.mask.targetOffset = 0;
        } else if (idx === this.state.currentIndex) {
          // Current centered image moves out
          const direction = newIndex > this.state.currentIndex ? -1 : 1;
          stage.image.targetOffset = direction * 0.5;
          stage.mask.targetOffset = direction;
        } else {
          // All other images maintain their position relative to the new center
          const direction = newIndex > idx ? -1 : 1;
          stage.image.targetOffset = direction * 0.5;
          stage.mask.targetOffset = direction;

          // Immediately set current offset to target to prevent unwanted transitions
          stage.image.offset = stage.image.targetOffset;
          stage.mask.offset = stage.mask.targetOffset;
        }
      });
    }
    // Handle sequential transitions (left/right clicks)
    else {
      this.state.stages.forEach((stage, idx) => {
        const direction = newIndex > idx ? -1 : 1;
        if (idx === newIndex) {
          stage.image.targetOffset = 0;
          stage.mask.targetOffset = 0;
        } else {
          stage.image.targetOffset = direction * 0.5;
          stage.mask.targetOffset = direction;
        }
      });
    }

    this.state.currentIndex = newIndex;
    this.state.isTransitioning = true;
    this.updateRenderOrder(newIndex);

    // Reset jump transition flag after setting up the transition
    this.state.isJumpTransition = false;
  }

  // Update animation state
  updateAnimation(dt) {
    if (!this.state.isTransitioning) return;

    const imageSpeed = this.params.imageSmoothing * dt;
    const maskSpeed = this.params.maskSmoothing * dt;
    let allComplete = true;

    // Update each stage
    this.state.stages.forEach((stage) => {
      const imageDelta = stage.image.targetOffset - stage.image.offset;
      stage.image.offset += imageDelta * imageSpeed;

      const maskDelta = stage.mask.targetOffset - stage.mask.offset;
      stage.mask.offset += maskDelta * maskSpeed;

      // Check if this stage is still transitioning
      if (Math.abs(imageDelta) > this.params.minThreshold) {
        allComplete = false;
      }
    });

    // Remove stages that have completed their transition
    if (allComplete) {
      this.state.isTransitioning = false;
    }
  }

  // Render the current state
  render(ctx, allImages, imageRect, maskRect) {
    ctx.save();

    // Create mask
    ctx.beginPath();
    ctx.roundRect(maskRect.x, maskRect.y, maskRect.width, maskRect.height, 1);
    ctx.clip();

    // Render each stage
    this.state.renderOrder.forEach((orderIndex) => {
      const stage = this.state.stages[orderIndex];
      const stageImage = allImages[stage.imageIndex];

      ctx.save();
      const maskX = maskRect.x + maskRect.width * stage.mask.offset;
      ctx.beginPath();
      ctx.roundRect(maskX, maskRect.y, maskRect.width, maskRect.height, 1);
      ctx.clip();

      const stageX = imageRect.x + maskRect.width * stage.image.offset;
      ctx.drawImage(stageImage.element, stageX, imageRect.y, imageRect.width, imageRect.height);

      ctx.restore();
    });

    ctx.restore();
  }

  isTransitioning() {
    return this.state.isTransitioning;
  }
}
