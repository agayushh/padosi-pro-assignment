import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeIndianMobile } from "../src/domain/mobile.js";
import { profileSchema, registerSchema, taskSelectionSchema } from "../src/validation/schemas.js";

describe("Indian mobile numbers", () => {
  it("normalises a 10-digit number and a +91 prefix", () => {
    assert.equal(normalizeIndianMobile("9876543210"), "+919876543210");
    assert.equal(normalizeIndianMobile("+91 98765-43210"), "+919876543210");
    assert.equal(normalizeIndianMobile("919876543210"), "+919876543210");
    assert.equal(normalizeIndianMobile("09876543210"), "+919876543210");
  });

  it("rejects numbers that are not 10-digit Indian mobiles", () => {
    assert.equal(normalizeIndianMobile("5876543210"), null);
    assert.equal(normalizeIndianMobile("987654321"), null);
    assert.equal(normalizeIndianMobile("98765abc10"), null);
  });
});

describe("request validation", () => {
  it("lowercases email and rejects a weak password", () => {
    assert.equal(registerSchema.parse({ email: "A@Example.com", password: "secret12" }).email, "a@example.com");
    assert.throws(() => registerSchema.parse({ email: "a@example.com", password: "short1" }));
    assert.throws(() => registerSchema.parse({ email: "a@example.com", password: "longpassword" }));
  });

  it("requires name, mobile, and address, and treats business name as optional", () => {
    const saved = profileSchema.parse({
      name: "Maira K.",
      mobile: "9876543210",
      address: "Road 12, Banjara Hills",
      businessName: "  ",
    });
    assert.equal(saved.mobile, "+919876543210");
    assert.equal(saved.businessName, null);

    const withoutBusiness = profileSchema.parse({
      name: "मीरा",
      mobile: "+919876543210",
      address: "Road 12, Banjara Hills",
    });
    assert.equal(withoutBusiness.businessName, undefined);

    assert.throws(() =>
      profileSchema.parse({
        name: "M",
        mobile: "12345",
        address: "x",
      }),
    );
  });

  it("requires at least one unique task id", () => {
    assert.deepEqual(taskSelectionSchema.parse({ taskIds: [1, 2] }).taskIds, [1, 2]);
    assert.throws(() => taskSelectionSchema.parse({ taskIds: [] }));
    assert.throws(() => taskSelectionSchema.parse({ taskIds: [1, 1] }));
  });
});
