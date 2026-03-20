import Phaser from "phaser";
import "./style.css";
import { STAGES, type BlockKind, type StageCell, type StageDefinition } from "./stages";

const VIRTUAL_WIDTH = 390;
const VIRTUAL_HEIGHT = 844;
const TOP_HUD_HEIGHT = 92;
const ARENA_PADDING = 18;
const BLOCK_COLUMNS = 7;
const BLOCK_ROWS = 6;
const BALL_RADIUS = 9;
const BALL_SPEED = 380;
const PADDLE_WIDTH = 108;
const PADDLE_Y_OFFSET = 86;

type GameState = "ready" | "playing" | "won" | "lost";
type BallState = {
  shape: Phaser.GameObjects.Arc;
  velocity: Phaser.Math.Vector2;
};

type BlockState = {
  body: Phaser.GameObjects.Rectangle;
  label?: Phaser.GameObjects.Text;
  kind: BlockKind;
  hitsRemaining: number;
  isClearing: boolean;
};

class BreakoutScene extends Phaser.Scene {
  private paddle!: Phaser.GameObjects.Rectangle;
  private blocks: BlockState[] = [];
  private balls: BallState[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private legendText!: Phaser.GameObjects.Text;
  private overlayTitle!: Phaser.GameObjects.Text;
  private overlayMessage!: Phaser.GameObjects.Text;
  private overlayHint!: Phaser.GameObjects.Text;
  private stageText!: Phaser.GameObjects.Text;
  private score = 0;
  private lives = 3;
  private remainingBreakableBlocks = 0;
  private stageIndex = 0;
  private pointerX = VIRTUAL_WIDTH / 2;
  private dragStartX = 0;
  private dragPaddleStartX = VIRTUAL_WIDTH / 2;
  private activePointerId: number | null = null;
  private arenaTop = TOP_HUD_HEIGHT;
  private arenaBottom = VIRTUAL_HEIGHT - 40;
  private arenaLeft = ARENA_PADDING;
  private arenaRight = VIRTUAL_WIDTH - ARENA_PADDING;
  private paddleSpeed = 18;
  private gameState: GameState = "ready";

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

    if (this.gameState !== "playing") {
      for (const ball of this.balls) {
        ball.shape.x = this.paddle.x;
        ball.shape.y = this.paddle.y - 22;
      }
      return;
    }

    for (const ball of [...this.balls]) {
      ball.shape.x += ball.velocity.x * step;
      ball.shape.y += ball.velocity.y * step;

      this.handleWallCollisions(ball);
      this.handlePaddleCollision(ball);
      this.handleBlockCollision(ball);
    }

    this.cleanupLostBalls();
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

    this.stageText = this.add.text(VIRTUAL_WIDTH / 2, 58, "", {
      fontFamily: "Trebuchet MS, Verdana, sans-serif",
      fontSize: "18px",
      color: "#f6fbff",
    });
    this.stageText.setOrigin(0.5, 0);

    this.livesText = this.add.text(VIRTUAL_WIDTH - 20, 58, "", {
      fontFamily: "Trebuchet MS, Verdana, sans-serif",
      fontSize: "18px",
      color: "#ffd39c",
    });
    this.livesText.setOrigin(1, 0);

    this.legendText = this.add.text(20, VIRTUAL_HEIGHT - 18, "", {
      fontFamily: "Trebuchet MS, Verdana, sans-serif",
      fontSize: "12px",
      color: "#d8f7ff",
    });
    this.legendText.setOrigin(0, 1);
    this.legendText.setAlpha(0.8);
    this.legendText.setText("画面下をドラッグして操作  orange +ball  yellow hit");

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
    const stage = this.getCurrentStage();
    this.clearBlocks();

    const blockAreaWidth = this.arenaRight - this.arenaLeft - 8;
    const blockWidth = blockAreaWidth / BLOCK_COLUMNS - 8;
    const blockHeight = 24;
    const startX = this.arenaLeft + blockWidth / 2 + 8;
    const startY = this.arenaTop + 56;

    this.remainingBreakableBlocks = 0;

    for (let row = 0; row < BLOCK_ROWS; row += 1) {
      for (let col = 0; col < BLOCK_COLUMNS; col += 1) {
        const x = startX + col * (blockWidth + 8);
        const y = startY + row * (blockHeight + 10);
        const cell = stage.layout[row][col];
        const kind = typeof cell === "string" ? cell : cell.kind;
        const block = this.buildBlock(cell, x, y, blockWidth, blockHeight);
        this.blocks.push(block);
        if (kind !== "wall") {
          this.remainingBreakableBlocks += 1;
        }
      }
    }
  }

  private buildBlock(
    cell: StageCell,
    x: number,
    y: number,
    width: number,
    height: number,
  ): BlockState {
    const kind = typeof cell === "string" ? cell : cell.kind;
    const fillColors: Record<BlockKind, number> = {
      normal: 0x78d8f8,
      multi: 0xff9f5c,
      hard: 0xf3df72,
      wall: 0x5f7482,
    };
    const block = this.add.rectangle(x, y, width, height, fillColors[kind]);
    block.setStrokeStyle(2, 0xffffff, kind === "wall" ? 0.35 : 0.25);

    const hitsRemaining = kind === "hard" ? (typeof cell === "string" ? 2 : cell.hits) : 1;
    const state: BlockState = {
      body: block,
      kind,
      hitsRemaining,
      isClearing: false,
    };

    if (kind === "multi") {
      const label = this.add.text(x, y, "+", {
        fontFamily: "Trebuchet MS, Verdana, sans-serif",
        fontSize: "18px",
        fontStyle: "700",
        color: "#fff6e8",
      });
      label.setOrigin(0.5);
      state.label = label;
    }

    if (kind === "hard") {
      state.label = this.add.text(x, y, String(hitsRemaining), {
        fontFamily: "Trebuchet MS, Verdana, sans-serif",
        fontSize: "14px",
        fontStyle: "700",
        color: "#0d2033",
      });
      state.label.setOrigin(0.5);
    }

    if (kind === "wall") {
      state.label = this.add.text(x, y, "X", {
        fontFamily: "Trebuchet MS, Verdana, sans-serif",
        fontSize: "14px",
        fontStyle: "700",
        color: "#f6fbff",
      });
      state.label.setOrigin(0.5);
      block.setAlpha(0.95);
    }

    return state;
  }

  private clearBlocks(): void {
    for (const block of this.blocks) {
      block.body.destroy();
      block.label?.destroy();
    }
    this.blocks = [];
  }

  private createPaddle(): void {
    this.paddle = this.add.rectangle(
      VIRTUAL_WIDTH / 2,
      this.arenaBottom - PADDLE_Y_OFFSET,
      PADDLE_WIDTH,
      18,
      0xf3f8ff,
    );
    this.paddle.setStrokeStyle(3, 0x1e6f89, 0.45);
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
      if (this.activePointerId !== pointer.id) {
        return;
      }
      this.pointerX = this.dragPaddleStartX + (pointer.x - this.dragStartX);
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.activePointerId = pointer.id;
      this.dragStartX = pointer.x;
      this.dragPaddleStartX = this.paddle.x;
      this.pointerX = this.paddle.x;

      if (this.gameState === "ready") {
        this.startPlay();
        return;
      }

      if (this.gameState === "won" || this.gameState === "lost") {
        this.restartGame();
      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.activePointerId === pointer.id) {
        this.activePointerId = null;
      }
    });
  }

  private startPlay(): void {
    this.gameState = "playing";
    const openingVelocity = new Phaser.Math.Vector2(
      Phaser.Math.Between(-150, 150),
      -BALL_SPEED,
    )
      .normalize()
      .scale(BALL_SPEED);
    const firstBall = this.balls[0];
    if (firstBall) {
      firstBall.velocity.copy(openingVelocity);
    }
    this.setOverlay("", "", "");
  }

  private resetRound(): void {
    this.clearBalls();
    this.spawnBall(this.paddle.x, this.paddle.y - 22, new Phaser.Math.Vector2(0, 0));
    this.gameState = "ready";
    this.pointerX = this.paddle.x;
    this.refreshHud();
    this.setOverlay("Tap To Start", this.getCurrentStage().hint, "左右にドラッグしてパドルを動かす");
  }

  private restartGame(): void {
    this.score = 0;
    this.lives = 3;
    this.stageIndex = 0;
    this.refreshHud();
    this.createBlocks();
    this.resetRound();
  }

  private clearBalls(): void {
    for (const ball of this.balls) {
      ball.shape.destroy();
    }
    this.balls = [];
  }

  private spawnBall(x: number, y: number, velocity: Phaser.Math.Vector2): BallState {
    const ball = this.add.circle(x, y, BALL_RADIUS, 0xfff6e8);
    ball.setStrokeStyle(3, 0xffa85a, 0.65);
    const state: BallState = {
      shape: ball,
      velocity,
    };
    this.balls.push(state);
    return state;
  }

  private splitBall(source: BallState): void {
    const variants = [-28, 28];
    for (const angleOffset of variants) {
      const velocity = source.velocity.clone().rotate(Phaser.Math.DegToRad(angleOffset));
      velocity.normalize().scale(BALL_SPEED);
      const spawned = this.spawnBall(source.shape.x, source.shape.y, velocity);
      spawned.shape.setFillStyle(0xffe3be);
    }
  }

  private loseLife(): void {
    if (this.gameState !== "playing") {
      return;
    }

    this.lives -= 1;
    this.refreshHud();

    if (this.lives <= 0) {
      this.clearBalls();
      this.gameState = "lost";
      this.setOverlay("Game Over", "もう一度タップでやり直し", "score " + this.score);
      return;
    }

    this.resetRound();
  }

  private handleWallCollisions(ball: BallState): void {
    const radius = ball.shape.radius;

    if (ball.shape.x <= this.arenaLeft + radius) {
      ball.shape.x = this.arenaLeft + radius;
      ball.velocity.x = Math.abs(ball.velocity.x);
    }

    if (ball.shape.x >= this.arenaRight - radius) {
      ball.shape.x = this.arenaRight - radius;
      ball.velocity.x = -Math.abs(ball.velocity.x);
    }

    if (ball.shape.y <= this.arenaTop + radius) {
      ball.shape.y = this.arenaTop + radius;
      ball.velocity.y = Math.abs(ball.velocity.y);
    }
  }

  private handlePaddleCollision(ball: BallState): void {
    if (ball.velocity.y <= 0) {
      return;
    }

    const intersects =
      ball.shape.x + ball.shape.radius >= this.paddle.x - this.paddle.width / 2 &&
      ball.shape.x - ball.shape.radius <= this.paddle.x + this.paddle.width / 2 &&
      ball.shape.y + ball.shape.radius >= this.paddle.y - this.paddle.height / 2 &&
      ball.shape.y - ball.shape.radius <= this.paddle.y + this.paddle.height / 2;

    if (!intersects) {
      return;
    }

    const impact = (ball.shape.x - this.paddle.x) / (this.paddle.width / 2);
    ball.shape.y = this.paddle.y - this.paddle.height / 2 - ball.shape.radius - 1;
    ball.velocity
      .set(impact * BALL_SPEED * 0.95, -Math.abs(BALL_SPEED))
      .normalize()
      .scale(BALL_SPEED);
  }

  private handleBlockCollision(ball: BallState): void {
    for (const block of this.blocks) {
      if (!block.body.active || block.isClearing) {
        continue;
      }

      const halfWidth = block.body.width / 2;
      const halfHeight = block.body.height / 2;
      const hit =
        ball.shape.x + ball.shape.radius >= block.body.x - halfWidth &&
        ball.shape.x - ball.shape.radius <= block.body.x + halfWidth &&
        ball.shape.y + ball.shape.radius >= block.body.y - halfHeight &&
        ball.shape.y - ball.shape.radius <= block.body.y + halfHeight;

      if (!hit) {
        continue;
      }

      const overlapX = Math.min(
        ball.shape.x + ball.shape.radius - (block.body.x - halfWidth),
        block.body.x + halfWidth - (ball.shape.x - ball.shape.radius),
      );
      const overlapY = Math.min(
        ball.shape.y + ball.shape.radius - (block.body.y - halfHeight),
        block.body.y + halfHeight - (ball.shape.y - ball.shape.radius),
      );

      if (overlapX < overlapY) {
        ball.velocity.x *= -1;
      } else {
        ball.velocity.y *= -1;
      }

      this.onBlockHit(block, ball);
      return;
    }
  }

  private onBlockHit(block: BlockState, ball: BallState): void {
    if (block.kind === "wall") {
      this.tweens.add({
        targets: [block.body, block.label].filter(Boolean),
        alpha: 0.7,
        duration: 80,
        yoyo: true,
      });
      return;
    }

    if (block.kind === "multi") {
      this.splitBall(ball);
    }

    block.hitsRemaining -= 1;

    if (block.kind === "hard" && block.hitsRemaining > 0) {
      block.label?.setText(String(block.hitsRemaining));
      block.body.setFillStyle(block.hitsRemaining === 2 ? 0xf3df72 : 0xffc15c);
      this.score += 40;
      this.refreshHud();
      this.tweens.add({
        targets: [block.body, block.label].filter(Boolean),
        scaleX: 0.94,
        scaleY: 0.94,
        duration: 70,
        yoyo: true,
      });
      return;
    }

    block.isClearing = true;
    block.body.disableInteractive();
    block.body.active = false;
    block.label?.setVisible(false);

    this.tweens.add({
      targets: [block.body, block.label].filter(Boolean),
      scaleX: 0.85,
      scaleY: 0.85,
      alpha: 0,
      duration: 120,
      onComplete: () => {
        block.body.destroy();
        block.label?.destroy();
      },
    });

    this.remainingBreakableBlocks -= 1;
    this.score += block.kind === "multi" ? 150 : 100;
    this.refreshHud();

    if (this.remainingBreakableBlocks <= 0) {
      this.clearBalls();
      if (this.stageIndex >= STAGES.length - 1) {
        this.gameState = "won";
        this.setOverlay("All Clear", "全ステージ制圧", "タップで最初から");
        return;
      }

      this.stageIndex += 1;
      this.createBlocks();
      this.gameState = "ready";
      this.pointerX = this.paddle.x;
      this.spawnBall(this.paddle.x, this.paddle.y - 22, new Phaser.Math.Vector2(0, 0));
      this.refreshHud();
      this.setOverlay("Stage Clear", this.getCurrentStage().hint, "タップで次のステージへ");
    }
  }

  private cleanupLostBalls(): void {
    const survivors = this.balls.filter((ball) => ball.shape.y <= this.arenaBottom + 36);
    for (const ball of this.balls) {
      if (!survivors.includes(ball)) {
        ball.shape.destroy();
      }
    }
    this.balls = survivors;

    if (this.balls.length === 0) {
      this.loseLife();
    }
  }

  private refreshHud(): void {
    this.scoreText.setText("score " + this.score);
    this.stageText.setText(this.getCurrentStage().name);
    this.livesText.setText("life " + this.lives + "  ball " + this.balls.length);
  }

  private getCurrentStage(): StageDefinition {
    return STAGES[this.stageIndex];
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
