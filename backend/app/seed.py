"""Demo data: providers with services and availability, customers, bookings and reviews.

    python -m app.seed

Re-running is safe: every account under @example.com is deleted and recreated.
All demo accounts use the password "password123".
"""
import asyncio
import random
from datetime import date, time, timedelta
from typing import List, Tuple

import asyncpg

from app.core.security import hash_password
from app.core.timeutil import day_of_week, today_local
from app.db.pool import close_pool, init_pool

PASSWORD = "password123"
WEEKDAYS = [1, 2, 3, 4, 5]

# (name, email prefix, category, location, hourly rate, avatar img, bio, days, hours, services)
PROVIDERS = [
    ("Marcus Reed", "marcus", "Barber", "Brooklyn, NY", 45, 12,
     "Classic cuts and sharp fades for 12 years. Walk out looking like the best version of yourself.",
     WEEKDAYS + [6], (time(9), time(17)),
     [("Classic Haircut", "Scissor or clipper cut, wash and style.", 30, 35),
      ("Skin Fade", "Precision fade with line-up.", 45, 45),
      ("Beard Trim & Shape", "Hot towel, trim and razor line.", 30, 25)]),
    ("Priya Shah", "priya", "Tutor", "Toronto, ON", 60, 47,
     "Math and physics tutor (M.Sc.). High school through first-year university, exam prep a specialty.",
     WEEKDAYS, (time(15), time(21)),
     [("Math Tutoring", "One-on-one, any level up to Calculus II.", 60, 60),
      ("Physics Tutoring", "Mechanics, E&M, problem-solving strategies.", 60, 65),
      ("Exam Crash Session", "Two focused hours before your big test.", 120, 110)]),
    ("Sparkle & Co. Cleaning", "sparkle", "Cleaner", "Austin, TX", 40, 32,
     "Eco-friendly home cleaning, fully insured. We bring all supplies.",
     WEEKDAYS + [6], (time(8), time(18)),
     [("Standard Clean (1-2 BR)", "Kitchen, bathrooms, floors, dusting.", 120, 110),
      ("Deep Clean", "Inside appliances, baseboards, detailed scrub.", 240, 220),
      ("Move-out Clean", "Leave it spotless for your deposit.", 300, 280)]),
    ("Jordan Alvarez", "jordan", "Personal Trainer", "Miami, FL", 70, 15,
     "NASM-certified. Strength, conditioning and sustainable fat loss — no fads.",
     [1, 2, 3, 4, 5, 6], (time(6), time(12)),
     [("1:1 Training Session", "Personalised strength & conditioning.", 60, 70),
      ("Fitness Assessment", "Movement screen, goals and a 4-week plan.", 45, 50)]),
    ("Elena Petrova", "elena", "Massage Therapist", "Chicago, IL", 90, 44,
     "Registered massage therapist specialising in deep tissue and sports recovery.",
     [2, 3, 4, 5, 6], (time(10), time(19)),
     [("Swedish Massage", "Relaxing full-body massage.", 60, 85),
      ("Deep Tissue", "Targeted work on chronic tension.", 60, 100),
      ("Sports Recovery", "Pre/post-event treatment.", 90, 135)]),
    ("Sam Okafor", "sam", "Photographer", "Brooklyn, NY", 120, 59,
     "Portraits, headshots and small events. Edited gallery delivered in 5 days.",
     [4, 5, 6, 0], (time(9), time(18)),
     [("Professional Headshots", "30 min shoot, 5 retouched images.", 30, 150),
      ("Portrait Session", "Outdoor or studio, 20 edited images.", 90, 320)]),
    ("Happy Paws Grooming", "happypaws", "Pet Groomer", "Austin, TX", 55, 25,
     "Gentle grooming for dogs of all sizes. Fear-free certified.",
     WEEKDAYS, (time(9), time(16)),
     [("Bath & Brush", "Shampoo, blow-dry, nail trim.", 60, 55),
      ("Full Groom", "Bath plus breed-specific haircut.", 120, 95)]),
    ("Lily Chen", "lily", "Nail Technician", "Toronto, ON", 50, 9,
     "Gel, acrylic and nail art. Clean, sterilised tools every time.",
     [2, 3, 4, 5, 6], (time(11), time(19)),
     [("Gel Manicure", "Long-lasting gel polish.", 45, 45),
      ("Acrylic Full Set", "Sculpted extensions with polish.", 90, 75),
      ("Pedicure", "Soak, exfoliation and polish.", 60, 55)]),
    ("Daniel Brooks", "daniel", "Music Teacher", "Chicago, IL", 55, 68,
     "Guitar and piano lessons for all ages. Berklee graduate, patient and fun.",
     [1, 2, 3, 4, 6], (time(14), time(20)),
     [("Guitar Lesson", "Acoustic or electric, beginner to advanced.", 45, 50),
      ("Piano Lesson", "Classical or contemporary.", 45, 50)]),
    ("Ava Thompson", "ava", "Hair Stylist", "Miami, FL", 65, 26,
     "Colour specialist — balayage, highlights and lived-in blondes.",
     [2, 3, 4, 5, 6], (time(10), time(18)),
     [("Women's Cut & Style", "Consultation, wash, cut and blow-dry.", 60, 70),
      ("Balayage", "Hand-painted colour with toner.", 180, 220),
      ("Blowout", "Wash and voluminous blow-dry.", 45, 45)]),
]

CUSTOMERS = [
    ("Casey Morgan", "customer"),
    ("Riley Bennett", "riley"),
    ("Taylor Nguyen", "taylor"),
    ("Morgan Diaz", "morgan"),
]

REVIEW_TEXT = {
    5: ["Absolutely fantastic, would book again in a heartbeat.", "Professional, on time and great results.",
        "Best experience I've had — highly recommend!", "Exceeded my expectations in every way."],
    4: ["Really good service, just ran a few minutes late.", "Great work overall, very friendly.",
        "Solid experience, will be back."],
    3: ["Decent, but not quite what I was hoping for.", "Okay overall — communication could be better."],
}


def next_matching_day(start: date, days: List[int]) -> date:
    d = start
    while day_of_week(d) not in days:
        d += timedelta(days=1)
    return d


async def seed(conn: asyncpg.Connection) -> None:
    rng = random.Random(42)
    today = today_local()
    password_hash = hash_password(PASSWORD)

    await conn.execute("DELETE FROM users WHERE email LIKE '%@example.com'")

    customer_ids = []
    for name, prefix in CUSTOMERS:
        customer_ids.append(await conn.fetchval(
            "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'CUSTOMER') RETURNING id",
            name, f"{prefix}@example.com", password_hash,
        ))
    demo_customer = customer_ids[0]

    provider_rows: List[Tuple] = []  # (profile_id, services, days, hours)
    for name, prefix, category, location, rate, img, bio, days, hours, services in PROVIDERS:
        user_id = await conn.fetchval(
            "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'PROVIDER') RETURNING id",
            name, f"{prefix}@example.com", password_hash,
        )
        profile_id = await conn.fetchval(
            """
            INSERT INTO provider_profiles (user_id, bio, category, location, hourly_rate, avatar_url)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
            """,
            user_id, bio, category, location, rate, f"https://i.pravatar.cc/300?img={img}",
        )
        service_rows = []
        for s_name, desc, minutes, price in services:
            service_rows.append(await conn.fetchrow(
                """
                INSERT INTO services (provider_id, name, description, duration_minutes, price)
                VALUES ($1, $2, $3, $4, $5) RETURNING id, duration_minutes, price
                """,
                profile_id, s_name, desc, minutes, price,
            ))
        await conn.executemany(
            "INSERT INTO availability_slots (provider_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)",
            [(profile_id, d, hours[0], hours[1]) for d in days],
        )
        provider_rows.append((profile_id, service_rows, days, hours))

    async def book(customer_id, provider, service, d: date, start: time, status: str):
        end_minutes = start.hour * 60 + start.minute + service["duration_minutes"]
        end = time(end_minutes // 60, end_minutes % 60)
        return await conn.fetchval(
            """
            INSERT INTO bookings (customer_id, provider_id, service_id, date, start_time, end_time, status, price)
            VALUES ($1, $2, $3, $4, $5, $6, $7::booking_status, $8) RETURNING id
            """,
            customer_id, provider[0], service["id"], d, start, end, status, service["price"],
        )

    # Completed history with reviews: one booking per past day, so nothing overlaps
    for provider in provider_rows:
        profile_id, services, days, hours = provider
        for i in range(rng.randint(3, 6)):
            customer = customer_ids[i % len(customer_ids)]
            service = rng.choice(services)
            d = today - timedelta(days=7 + i * 3)
            booking_id = await book(customer, provider, service, d, hours[0], "COMPLETED")
            if i < 4 or customer != demo_customer:
                rating = rng.choice([5, 5, 5, 4, 4, 3])
                await conn.execute(
                    "INSERT INTO reviews (booking_id, customer_id, provider_id, rating, comment) VALUES ($1, $2, $3, $4, $5)",
                    booking_id, customer, profile_id, rating, rng.choice(REVIEW_TEXT[rating]),
                )

    # A completed but unreviewed appointment so the demo customer can try leaving a review
    marcus = provider_rows[0]
    await book(demo_customer, marcus, marcus[1][1], today - timedelta(days=2), time(15), "COMPLETED")

    # Upcoming bookings for the demo customer
    d = next_matching_day(today + timedelta(days=2), marcus[2])
    await book(demo_customer, marcus, marcus[1][0], d, time(10), "CONFIRMED")
    priya = provider_rows[1]
    d = next_matching_day(today + timedelta(days=3), priya[2])
    await book(demo_customer, priya, priya[1][0], d, time(17), "PENDING")

    # Give the demo provider (Marcus) a busy-looking dashboard
    if day_of_week(today) in marcus[2]:
        await book(customer_ids[1], marcus, marcus[1][0], today, time(16), "CONFIRMED")
    d = next_matching_day(today + timedelta(days=1), marcus[2])
    await book(customer_ids[2], marcus, marcus[1][1], d, time(13), "PENDING")
    d = next_matching_day(today + timedelta(days=4), marcus[2])
    await book(customer_ids[3], marcus, marcus[1][2], d, time(11), "CONFIRMED")


async def main() -> None:
    pool = await init_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await seed(conn)
    finally:
        await close_pool()
    print("Seeded demo data. Log in with any of these (password: password123):")
    print("  customer@example.com   (customer)")
    print("  marcus@example.com     (provider: barber)")
    print("  priya@example.com      (provider: tutor)")


if __name__ == "__main__":
    asyncio.run(main())
