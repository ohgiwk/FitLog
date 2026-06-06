import { Exercise } from "../types";
import { uid } from "../utils";

export const starterExercises: Exercise[] = [
  { id: uid(), part: "胸", name: "ベンチプレス", weight: 60, reps: 5 },
  { id: uid(), part: "胸", name: "スミスマシン・インクラインベンチプレス", weight: 30, reps: 12 },
  { id: uid(), part: "胸", name: "デクラインダンベルプレス", weight: 24, reps: 10 },
  { id: uid(), part: "背中", name: "インバーテッドロー", weight: 0, reps: 10 },
  { id: uid(), part: "背中", name: "ハーフデッドリフト", weight: 80, reps: 8 },
  { id: uid(), part: "背中", name: "Tバーロウ", weight: 35, reps: 10 },
  { id: uid(), part: "脚", name: "シーテッドレッグカール", weight: 35, reps: 12 },
  { id: uid(), part: "脚", name: "ゴブレットスクワット", weight: 20, reps: 10 },
  { id: uid(), part: "肩", name: "ショルダープレス", weight: 20, reps: 10 },
  { id: uid(), part: "腕", name: "ダンベルカール", weight: 10, reps: 12 },
];
