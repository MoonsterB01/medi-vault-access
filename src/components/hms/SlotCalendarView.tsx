import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isSameDay, addDays, startOfWeek } from "date-fns";
import { AlertCircle, CheckCircle, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlotData {
  date: string;
  start_time: string;
  end_time: string;
  isExisting?: boolean;
  isConflict?: boolean;
  id?: string;
}

interface SlotCalendarViewProps {
  slots: SlotData[];
  onSlotsUpdate: (slots: SlotData[]) => void;
  onSave: () => void;
  startDate: string;
  endDate: string;
  viewMode?: "day" | "week";
}

export default function SlotCalendarView({
  slots,
  onSlotsUpdate,
  onSave,
  startDate,
  endDate,
  viewMode = "week",
}: SlotCalendarViewProps) {
  const [draggedSlot, setDraggedSlot] = useState<SlotData | null>(null);
  const [dragOverTime, setDragOverTime] = useState<{ date: string; time: string } | null>(null);

  const generateTimeSlots = () => {
    const times: string[] = [];
    for (let h = 0; h < 24; h++) {
      times.push(`${String(h).padStart(2, "0")}:00`);
      times.push(`${String(h).padStart(2, "0")}:30`);
    }
    return times;
  };

  const getDaysToShow = () => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const days: Date[] = [];
    
    if (viewMode === "day") {
      days.push(start);
    } else {
      const weekStart = startOfWeek(start);
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        if (day >= start && day <= end) {
          days.push(day);
        }
      }
    }
    return days;
  };

  const timeSlots = generateTimeSlots();
  const daysToShow = getDaysToShow();

  const getSlotsForDay = (day: Date) => {
    return slots.filter((slot) => isSameDay(parseISO(slot.date), day));
  };

  const checkOverlap = (slot1: SlotData, slot2: SlotData) => {
    if (slot1.date !== slot2.date) return false;
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    return (
      toMin(slot1.start_time) < toMin(slot2.end_time) &&
      toMin(slot1.end_time) > toMin(slot2.start_time)
    );
  };

  const getSlotPosition = (startTime: string, endTime: string) => {
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const startMin = toMin(startTime);
    const durationMin = toMin(endTime) - startMin;
    const top = (startMin / (24 * 60)) * 100;
    const height = (durationMin / (24 * 60)) * 100;
    return { top: `${top}%`, height: `${height}%` };
  };

  const handleDragStart = (slot: SlotData) => {
    if (!slot.isExisting) {
      setDraggedSlot(slot);
    }
  };

  const handleDragOver = (e: React.DragEvent, date: string, time: string) => {
    e.preventDefault();
    setDragOverTime({ date, time });
  };

  const handleDrop = (e: React.DragEvent, date: string, time: string) => {
    e.preventDefault();
    if (!draggedSlot) return;

    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const oldStart = toMin(draggedSlot.start_time);
    const oldEnd = toMin(draggedSlot.end_time);
    const duration = oldEnd - oldStart;
    const newStartMin = toMin(time);
    const newEndMin = newStartMin + duration;

    const newStart = `${String(Math.floor(newStartMin / 60)).padStart(2, "0")}:${String(
      newStartMin % 60
    ).padStart(2, "0")}`;
    const newEnd = `${String(Math.floor(newEndMin / 60)).padStart(2, "0")}:${String(
      newEndMin % 60
    ).padStart(2, "0")}`;

    const updatedSlot = {
      ...draggedSlot,
      date,
      start_time: newStart,
      end_time: newEnd,
    };

    const updatedSlots = slots.map((s) =>
      s === draggedSlot ? updatedSlot : s
    );

    // Recheck conflicts
    const slotsWithConflicts = updatedSlots.map((slot) => ({
      ...slot,
      isConflict: updatedSlots.some(
        (other) => other !== slot && checkOverlap(slot, other)
      ),
    }));

    onSlotsUpdate(slotsWithConflicts);
    setDraggedSlot(null);
    setDragOverTime(null);
  };

  const handleDragEnd = () => {
    setDraggedSlot(null);
    setDragOverTime(null);
  };

  const conflictCount = slots.filter((s) => s.isConflict && !s.isExisting).length;
  const hasConflicts = conflictCount > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Slot Calendar View
            {hasConflicts ? (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {conflictCount} Conflicts
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                No Conflicts
              </Badge>
            )}
          </CardTitle>
          <Button onClick={onSave} disabled={hasConflicts}>
            Save All Slots
          </Button>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/20 border-2 border-primary rounded" />
            <span>Existing Slots</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-secondary border-2 border-secondary-foreground rounded" />
            <span>New Slots</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-destructive/20 border-2 border-destructive rounded" />
            <span>Conflicts</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <div className="grid gap-4" style={{ gridTemplateColumns: `80px repeat(${daysToShow.length}, 1fr)`, minWidth: "800px" }}>
            {/* Header */}
            <div className="font-medium text-sm sticky top-0 bg-background z-10">Time</div>
            {daysToShow.map((day) => (
              <div key={day.toISOString()} className="font-medium text-sm text-center sticky top-0 bg-background z-10">
                {format(day, "EEE, MMM d")}
              </div>
            ))}

            {/* Time slots and calendar grid */}
            {timeSlots.map((time) => (
              <>
                <div key={`time-${time}`} className="text-xs text-muted-foreground py-2 border-t">
                  {time}
                </div>
                {daysToShow.map((day) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const daySlots = getSlotsForDay(day);
                  
                  return (
                    <div
                      key={`${dayStr}-${time}`}
                      className={cn(
                        "relative border-t min-h-[40px]",
                        dragOverTime?.date === dayStr && dragOverTime?.time === time && "bg-accent/50"
                      )}
                      onDragOver={(e) => handleDragOver(e, dayStr, time)}
                      onDrop={(e) => handleDrop(e, dayStr, time)}
                    >
                      {/* Render slots that intersect with this time */}
                      {daySlots
                        .filter((slot) => {
                          const toMin = (t: string) => {
                            const [h, m] = t.split(":").map(Number);
                            return h * 60 + m;
                          };
                          const slotStart = toMin(slot.start_time);
                          const timeMin = toMin(time);
                          return slotStart === timeMin;
                        })
                        .map((slot, idx) => {
                          const { top, height } = getSlotPosition(slot.start_time, slot.end_time);
                          return (
                            <div
                              key={`slot-${idx}`}
                              className={cn(
                                "absolute left-0 right-0 p-1 rounded border-2 cursor-move text-xs overflow-hidden",
                                slot.isExisting
                                  ? "bg-primary/20 border-primary"
                                  : slot.isConflict
                                  ? "bg-destructive/20 border-destructive"
                                  : "bg-secondary border-secondary-foreground",
                                draggedSlot === slot && "opacity-50"
                              )}
                              style={{ top, height, minHeight: "30px" }}
                              draggable={!slot.isExisting}
                              onDragStart={() => handleDragStart(slot)}
                              onDragEnd={handleDragEnd}
                            >
                              <div className="flex items-center gap-1">
                                {!slot.isExisting && <GripVertical className="h-3 w-3 flex-shrink-0" />}
                                <div className="overflow-hidden">
                                  <div className="font-medium truncate">
                                    {slot.start_time} - {slot.end_time}
                                  </div>
                                  {slot.isConflict && (
                                    <div className="text-destructive text-[10px]">Conflict</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
