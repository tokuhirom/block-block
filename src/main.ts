import Phaser from "phaser";
import "./style.css";

const VIRTUAL_WIDTH = 390;
const VIRTUAL_HEIGHT = 844;
const TOP_HUD_HEIGHT = 92;
const ARENA_PADDING = 18;
const BLOCK_COLUMNS = 7;
const BLOCK_ROWS = 6;

class BreakoutScene extends Phaser.Scene {
  private paddle!: Phaser.GameObjects.Rectangle;
  private ball!: Phaser.GameObjects.Arc;
  private blocks!: Phaser.GameObjects.Group;
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private overlayTitle!: Phaser.GameObjects.Text;
  private overlayMessage!: Phaser.GameObjects.Text;
  private overlayHint!: Phaser.GameObjects.Text;
  private score = 0;
  private lives = 3;
  private remainingBlocks = 0;
  private pointerX = VIRTUAL_WIDTH / 2;
  private arenaTop = TOP_HUD_HEIGHT;
  private arenaBottom = VIRTUAL_HEIGHT - 40;
  private arenaLeft = ARENA_PADDING;
  private arenaRight = VIRTUAL_WIDTH - ARENA_PADDING;
  private paddleSpeed = 18;
  private ballVelocity = new Phaser.Math.Vector2(0, 0);
  private ballSpeed = 380;
  private ballReleased = false;
  private gameState: "ready" | "playing" | "won" | "lost" = "ready";

  constructor() {
    super("BreakoutScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#113247");
    this.drawBackdrop();
    this.createHud();
    this.createBounds();
    this.createBlocks();
    this.createPaddle();
    this.createBall();
    this.createOverlay();
    this.registerInput();
    this.resetRound();
  }

  update(_: number, delta: number): void {
    const step = delta / 1000;
    const targetX = Phaser.Math.Clamp(
      this.pointerX,
      this.arenaLeft + this.paddle.width / 2,
      this.arenaRight - this.paddle.width / 2,
    );
    this.paddle.x = Phaser.Math.Linear(
      this.paddle.x,
      targetX,
      Math.min(1, this.paddleSpeed * step),
    );

    if (!this.ballReleased) {
      this.ball.x = this.paddle.x;
      this.ball.y = this.paddle.y - 22;
      return;
    }

    this.ball.x += this.ballVelocity.x * step;
    this.ball.y += this.ballVelocity.y * step;

    this.handleWallCollisions();
    this.handlePaddleCollision();
    this.handleBlockCollision();

    if (this.ball.y > this.arenaBottom + 36) {
      this.loseLife();
    }
  }

  private drawBackdrop(): void {
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x10253d, 0x10253d, 0x1d6c83, 0x1d6c83, 1);
    graphics.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    graphics.fillStyle(0xffffff, 0.06);
    graphics.fillCircle(50, 120, 90);
    graphics.fillCircle(340, 240, 120);
    graphics.fillCircle(180, 720, 140);

    graphics.lineStyle(2, 0xffffff, 0.08);
    graphics.strokeRoundedRect(
      this.arenaLeft,
      this.arenaTop,
      this.arenaRight - this.arenaLeft,
      this.arenaBottom - this.arenaTop,
      24,
    );
  }

  private createHud(): void {
    const title = this.add.text(20, 22, "BLOCK BLOCK", {
      fontFamily: "Trebuchet MS, Verdana, sans-serif",
      fontSize: "28px",
      fontStyle: "700",
      color: "#f6fbff",
    });
    title.setShadow(0, 2, "#0b1721", 6);

    this.scoreText = this.add.text(20, 58, "", {
      fontFamily: "Trebuchet MS, Verdana, sans-serif",
      fontSize: "18px",
      color: "#d8f7ff",
    });

    this.livesText = this.add.text(VIRTUAL_WIDTH - 20, 58, "", {
      fontFamily: "Trebuchet MS, Verdana, sans-serif",
      fontSize: "18px",
      color: "#ffd39c",
    });
    this.livesText.setOrigin(1, 0);

    this.refreshHud();
  }

  private createBounds(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0xffffff, 0.18);
    graphics.strokeRoundedRect(
      this.arenaLeft,
      this.arenaTop,
      this.arenaRight - this.arenaLeft,
      this.arenaBottom - this.arenaTop,
      24,
    );
  }

  private createBlocks(): void {
    this.blocks = this.add.group();

    const blockAreaWidth = this.arenaRight - this.arenaLeft - 8;
    const blockWidth = blockAreaWidth / BLOCK_COLUMNS - 8;
    const blockHeight = 24;
    const startX = this.arenaLeft + blockWidth / 2 + 8;
    const startY = this.arenaTop + 56;
    const colors = [0xf38a6b, 0xffc15c, 0xf9f871, 0x83e7a1, 0x78d8f8, 0xb6a3ff];

    this.remainingBlocks = 0;

    for (let row = 0; row < BLOCK_ROWS; row += 1) {
      for (let col = 0; col < BLOCK_COLUMNS; col += 1) {
        const x = startX + col * (blockWidth + 8);
        const y = startY + row * (blockHeight + 10);
        const block = this.add.rectangle(x, y, blockWidth, blockHeight, colors[row]);
        block.setStrokeStyle(2, 0xffffff, 0.25);
        this.blocks.add(block);
        this.remainingBlocks += 1;
      }
    }
  }

  private createPaddle(): void {
    this.paddle = this.add.rectangle(
      VIRTUAL_WIDTH / 2,
      this.arenaBottom - 32,
      108,
      18,
      0xf3f8ff,
    );
    this.paddle.setStrokeStyle(3, 0x1e6f89, 0.45);
  }

  private createBall(): void {
    this.ball = this.add.circle(VIRTUAL_WIDTH / 2, this.arenaBottom - 54, 9, 0xfff6e8);
    this.ball.setStrokeStyle(3, 0xffa85a, 0.65);
  }

  private createOverlay(): void {
    this.overlayTitle = this.add.text(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 - 56, "", {
      fontFamily: "Trebuchet MS, Verdana, sans-serif",
      fontSize: "34px",
      fontStyle: "700",
      color: "#ffffff",
      align: "center",
    });
    this.overlayTitle.setOrigin(0.5);

    this.overlayMessage = this.add.text(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, "", {
      fontFamily: "Trebuchet MS, Verdana, sans-serif",
      fontSize: "18px",
      color: "#d8f7ff",
      align: "center",
      wordWrap: { width: 280 },
    });
    this.overlayMessage.setOrigin(0.5);

    this.overlayHint = this.add.text(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 74, "", {
      fontFamily: "Trebuchet MS, Verdana, sans-serif",
      fontSize: "16px",
      color: "#ffd39c",
      align: "center",
    });
    this.overlayHint.setOrigin(0.5);
  }

  private registerInput(): void {
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.pointerX = pointer.x;
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.pointerX = pointer.x;

      if (this.gameState === "ready") {
        this.startPlay();
        return;
      }

      if (this.gameState === "won" || this.gameState === "lost") {
        this.restartGame();
      }
    });
  }

  private startPlay(): void {
    this.gameState = "playing";
    this.ballReleased = true;
    this.ballVelocity.set(
      Phaser.Math.Between(-150, 150),
      -this.ballSpeed,
    ).normalize().scale(this.ballSpeed);
    this.setOverlay("", "", "");
  }

  private resetRound(): void {
    this.ballReleased = false;
    this.gameState = "ready";
    this.ballVelocity.set(0, 0);
    this.pointerX = this.paddle.x;
    this.setOverlay("Tap To Start", "左右にドラッグしてパドルを動かす", "タップでボール発射");
  }

  private restartGame(): void {
    this.score = 0;
    this.lives = 3;
    this.refreshHud();
    this.blocks.clear(true, true);
    this.createBlocks();
    this.resetRound();
  }

  private loseLife(): void {
    if (this.gameState !== "playing") {
      return;
    }

    this.lives -= 1;
    this.refreshHud();

    if (this.lives <= 0) {
      this.ballReleased = false;
      this.gameState = "lost";
      this.setOverlay("Game Over", "もう一度タップでやり直し", "score " + this.score);
      return;
    }

    this.resetRound();
  }

  private handleWallCollisions(): void {
    const radius = this.ball.radius;

    if (this.ball.x <= this.arenaLeft + radius) {
      this.ball.x = this.arenaLeft + radius;
      this.ballVelocity.x = Math.abs(this.ballVelocity.x);
    }

    if (this.ball.x >= this.arenaRight - radius) {
      this.ball.x = this.arenaRight - radius;
      this.ballVelocity.x = -Math.abs(this.ballVelocity.x);
    }

    if (this.ball.y <= this.arenaTop + radius) {
      this.ball.y = this.arenaTop + radius;
      this.ballVelocity.y = Math.abs(this.ballVelocity.y);
    }
  }

  private handlePaddleCollision(): void {
    if (this.ballVelocity.y <= 0) {
      return;
    }

    const intersects =
      this.ball.x + this.ball.radius >= this.paddle.x - this.paddle.width / 2 &&
      this.ball.x - this.ball.radius <= this.paddle.x + this.paddle.width / 2 &&
      this.ball.y + this.ball.radius >= this.paddle.y - this.paddle.height / 2 &&
      this.ball.y - this.ball.radius <= this.paddle.y + this.paddle.height / 2;

    if (!intersects) {
      return;
    }

    const impact = (this.ball.x - this.paddle.x) / (this.paddle.width / 2);
    this.ball.y = this.paddle.y - this.paddle.height / 2 - this.ball.radius - 1;
    this.ballVelocity.set(
      impact * this.ballSpeed * 0.95,
      -Math.abs(this.ballSpeed),
    ).normalize().scale(this.ballSpeed);
  }

  private handleBlockCollision(): void {
    const children = this.blocks.getChildren() as Phaser.GameObjects.Rectangle[];

    for (const block of children) {
      const halfWidth = block.width / 2;
      const halfHeight = block.height / 2;
      const hit =
        this.ball.x + this.ball.radius >= block.x - halfWidth &&
        this.ball.x - this.ball.radius <= block.x + halfWidth &&
        this.ball.y + this.ball.radius >= block.y - halfHeight &&
        this.ball.y - this.ball.radius <= block.y + halfHeight;

      if (!hit) {
        continue;
      }

      const overlapX = Math.min(
        this.ball.x + this.ball.radius - (block.x - halfWidth),
        block.x + halfWidth - (this.ball.x - this.ball.radius),
      );
      const overlapY = Math.min(
        this.ball.y + this.ball.radius - (block.y - halfHeight),
        block.y + halfHeight - (this.ball.y - this.ball.radius),
      );

      if (overlapX < overlapY) {
        this.ballVelocity.x *= -1;
      } else {
        this.ballVelocity.y *= -1;
      }

      this.tweens.add({
        targets: block,
        scaleX: 0.85,
        scaleY: 0.85,
        alpha: 0,
        duration: 120,
        onComplete: () => block.destroy(),
      });

      this.remainingBlocks -= 1;
      this.score += 100;
      this.refreshHud();

      if (this.remainingBlocks <= 0) {
        this.ballReleased = false;
        this.gameState = "won";
        this.setOverlay("Stage Clear", "全ブロック破壊", "タップでリスタート");
      }
      return;
    }
  }

  private refreshHud(): void {
    this.scoreText.setText("score " + this.score);
    this.livesText.setText("life " + this.lives);
  }

  private setOverlay(title: string, message: string, hint: string): void {
    this.overlayTitle.setText(title);
    this.overlayMessage.setText(message);
    this.overlayHint.setText(hint);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#113247",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIRTUAL_WIDTH,
    height: VIRTUAL_HEIGHT,
  },
  scene: [BreakoutScene],
};

new Phaser.Game(config);
