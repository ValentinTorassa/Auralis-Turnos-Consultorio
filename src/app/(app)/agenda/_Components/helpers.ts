import type { Id } from "../../../../../convex/_generated/dataModel";

export type TimelineAppointment = {
  _id: Id<"appointments">;
  startTime: number;
  endTime: number;
  status: string;
  paymentStatus: string;
  notes?: string;
  title?: string;
  type?: { name: string; color: string } | null;
  patient?: { fullName: string } | null;
};

export function layoutTimelineLanes(appointments: TimelineAppointment[]) {
  const sorted = [...appointments].sort(
    (left, right) =>
      left.startTime - right.startTime || left.endTime - right.endTime,
  );
  const placed: Array<{
    appt: TimelineAppointment;
    lane: number;
    laneCount: number;
  }> = [];
  let cluster: Array<{ appt: TimelineAppointment; lane: number }> = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;

  function flushCluster() {
    const laneCount = laneEnds.length || 1;
    for (const item of cluster) placed.push({ ...item, laneCount });
    cluster = [];
    laneEnds = [];
  }

  for (const appointment of sorted) {
    if (appointment.startTime >= clusterEnd) {
      flushCluster();
      clusterEnd = appointment.endTime;
    } else {
      clusterEnd = Math.max(clusterEnd, appointment.endTime);
    }

    let lane = laneEnds.findIndex((end) => end <= appointment.startTime);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(appointment.endTime);
    } else {
      laneEnds[lane] = appointment.endTime;
    }
    cluster.push({ appt: appointment, lane });
  }

  flushCluster();
  return placed;
}
