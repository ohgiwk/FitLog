import { WorkoutSet } from "../types";
import { calcRm, number } from "../utils";

export function HomeSetRow({ set, index }: { set: WorkoutSet; index: number }) {
  const weight = number(set.weight);
  const reps = number(set.reps);
  return (
    <tr>
      <td className="set-number">{index + 1}</td>
      <td className="weight">{weight ? <>{weight.toFixed(1)} <small>Kg</small></> : "自重"}</td>
      <td className="lbs">{weight ? `${(weight * 2.20462).toFixed(2)}Lbs` : "-"}</td>
      <td className="reps">{reps} <small>回</small></td>
      <td className="rm">{weight ? `${calcRm(weight, reps)}Kg` : "-"}</td>
    </tr>
  );
}
