"use client";

import { Loader2, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StarInput } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { Booking } from "@/types";

export function ReviewDialog({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
      await api.post(`/bookings/${booking.id}/review`, { rating, comment });
      toast.success("Thanks for your review!");
      setOpen(false);
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Star /> Leave a review
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How was {booking.service_name}?</DialogTitle>
          <DialogDescription>Your review helps others choose {booking.provider_name}.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <StarInput value={rating} onChange={setRating} />
          <div className="grid gap-2">
            <Label htmlFor="comment">Comments (optional)</Label>
            <Textarea id="comment" rows={4} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What stood out?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Not now
          </Button>
          <Button onClick={submit} disabled={!rating || pending}>
            {pending && <Loader2 className="animate-spin" />} Submit review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
