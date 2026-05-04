import { describe, it, expect } from "vitest";
import { verticals, getVertical } from "$lib/config/verticals.js";

describe("verticals config", () => {
  it("has all seven verticals", () => {
    expect(Object.keys(verticals).sort()).toEqual(
      ["clinic", "coaching", "gym", "other", "restaurant", "retail", "salon"],
    );
  });

  it("every vertical has required fields", () => {
    for (const v of Object.values(verticals)) {
      expect(v.id).toBeTruthy();
      expect(v.name).toBeTruthy();
      expect(v.defaultSkills.length).toBeGreaterThan(0);
      expect(typeof v.rebookDays).toBe("number");
    }
  });

  it("salon has booking-related skills", () => {
    const s = verticals.salon;
    expect(s.defaultSkills).toContain("booking");
    expect(s.defaultSkills).toContain("reschedule");
    expect(s.defaultSkills).toContain("cancel");
  });

  it("clinic has prescription_reminder", () => {
    expect(verticals.clinic.defaultSkills).toContain("prescription_reminder");
  });

  it("coaching has fee_reminder and exam_countdown", () => {
    expect(verticals.coaching.defaultSkills).toContain("fee_reminder");
    expect(verticals.coaching.defaultSkills).toContain("exam_countdown");
  });

  it("retail has no appointment types", () => {
    expect(verticals.retail.appointmentTypes).toHaveLength(0);
  });

  it("restaurant uses queue booking mode", () => {
    for (const apt of verticals.restaurant.appointmentTypes) {
      expect(apt.defaultBookingMode).toBe("queue");
    }
  });

  it("gym has group class with capacity", () => {
    const group = verticals.gym.appointmentTypes.find((a) => a.id === "group_class");
    expect(group).toBeDefined();
    expect(group!.defaultCapacity).toBe(20);
  });
});

describe("getVertical", () => {
  it("returns correct vertical for known ID", () => {
    expect(getVertical("salon").name).toBe("Salon");
    expect(getVertical("clinic").name).toBe("Clinic");
  });

  it("falls back to 'other' for unknown ID", () => {
    expect(getVertical("unknown").id).toBe("other");
    expect(getVertical("").id).toBe("other");
  });
});
