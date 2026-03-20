export type BlockKind = "normal" | "multi" | "hard" | "wall";
export type HardBlockCell = {
  kind: "hard";
  hits: number;
};
export type StageCell = BlockKind | HardBlockCell;

export type StageRow = [StageCell, StageCell, StageCell, StageCell, StageCell, StageCell, StageCell];

export type StageDefinition = {
  name: string;
  hint: string;
  layout: [StageRow, StageRow, StageRow, StageRow, StageRow, StageRow];
};

export const STAGES: StageDefinition[] = [
  {
    name: "Stage 1",
    hint: "特殊ブロックの基本配置",
    layout: [
      ["wall", "normal", "hard", "multi", "hard", "normal", "wall"],
      ["normal", { kind: "hard", hits: 3 }, "normal", "normal", "normal", "hard", "normal"],
      ["multi", "normal", "hard", "wall", "hard", "normal", "multi"],
      ["normal", "normal", "multi", "hard", "multi", "normal", "normal"],
      [{ kind: "hard", hits: 2 }, "normal", "wall", "normal", "wall", "normal", { kind: "hard", hits: 3 }],
      ["normal", "multi", "normal", "hard", "normal", "multi", "normal"],
    ],
  },
  {
    name: "Stage 2",
    hint: "中央壁でルートを絞る",
    layout: [
      ["normal", { kind: "hard", hits: 4 }, "wall", "multi", "wall", { kind: "hard", hits: 4 }, "normal"],
      ["multi", "normal", "wall", "hard", "wall", "normal", "multi"],
      [{ kind: "hard", hits: 3 }, "normal", "normal", "normal", "normal", "normal", { kind: "hard", hits: 3 }],
      ["wall", "wall", "multi", { kind: "hard", hits: 4 }, "multi", "wall", "wall"],
      ["hard", "normal", "normal", "wall", "normal", "normal", "hard"],
      ["normal", "multi", { kind: "hard", hits: 2 }, "normal", { kind: "hard", hits: 2 }, "multi", "normal"],
    ],
  },
  {
    name: "Stage 3",
    hint: "増殖ブロック多めの終盤配置",
    layout: [
      ["multi", { kind: "hard", hits: 4 }, "multi", "wall", "multi", { kind: "hard", hits: 4 }, "multi"],
      ["normal", "wall", { kind: "hard", hits: 3 }, "normal", { kind: "hard", hits: 3 }, "wall", "normal"],
      ["multi", "normal", "multi", { kind: "hard", hits: 2 }, "multi", "normal", "multi"],
      [{ kind: "hard", hits: 4 }, "hard", "wall", "multi", "wall", "hard", { kind: "hard", hits: 4 }],
      ["normal", "multi", "normal", "normal", "normal", "multi", "normal"],
      ["wall", "normal", "hard", "multi", "hard", "normal", "wall"],
    ],
  },
];
