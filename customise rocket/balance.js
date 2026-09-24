(function (root) {
  const D = 1;
  const R = D / 2;
  const PAYLOADS = {
    foam: { mass: 5, label: "Foam crate" },
    alloy: { mass: 16, label: "Alloy box" },
    steel: { mass: 32, label: "Steel block" },
    lead: { mass: 50, label: "Lead brick" }
  };

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function chordOf(finSize) {
    return 0.55 + finSize * 0.42;
  }

  function payloadMass(id) {
    return (PAYLOADS[id] || PAYLOADS.alloy).mass;
  }

  function analyze(raw) {
    const noseLen = clamp(raw.noseLen, 0.45, 2.4);
    const bodyLen = clamp(raw.bodyLen, 2.4, 8);
    const finSize = clamp(raw.finSize, 0.25, 2.2);
    const finPos = clamp(raw.finPos, 0, 100);
    const payloadPos = clamp(raw.payloadPos, 0, 100);
    const payload = PAYLOADS[raw.payload] ? raw.payload : "alloy";
    const nozzle = clamp(raw.nozzle, 2, 80);
    const fuel = clamp(raw.fuel, 0, 90);
    const chord = chordOf(finSize);
    const span = finSize;
    const maxSlide = Math.max(0, bodyLen - chord - 0.08);
    const slide = (finPos / 100) * maxSlide;

    const xn = (2 / 3) * noseLen;
    const cnNose = 2;
    const lf = span;
    const kBody = 1 + R / (span + R);
    const cnFin = kBody * (4 * 4 * (span / D) * (span / D)) /
      (1 + Math.sqrt(1 + Math.pow((2 * lf) / (chord + chord), 2)));
    const xFin = noseLen + bodyLen - slide - chord / 2;
    const cn = cnNose + cnFin;
    const cp = (cnNose * xn + cnFin * xFin) / cn;

    const scales = { foam: 1.25, alloy: 1, steel: 0.86, lead: 0.62 };
    const fuelH = (fuel / 90) * bodyLen * 0.62;
    const cargoHalf = 0.17 * (scales[payload] || 1);
    const yHigh = bodyLen * 0.9;
    const yFloor = Math.min(yHigh - 0.08, fuelH + cargoHalf + 0.06);
    const payloadY = yHigh + (payloadPos / 100) * (yFloor - yHigh);
    const payloadX = noseLen + bodyLen - payloadY;

    const parts = [];
    parts.push({ m: 2.4 * noseLen, x: noseLen * 0.75 });
    parts.push({ m: payloadMass(payload), x: payloadX });
    parts.push({ m: 3.6 * bodyLen, x: noseLen + bodyLen * 0.48 });
    parts.push({ m: 1.6 * span * chord, x: xFin });
    parts.push({ m: nozzle, x: noseLen + bodyLen + 0.05 });
    if (fuel > 0.1) parts.push({ m: fuel, x: noseLen + bodyLen - fuelH / 2 });

    let mass = 0;
    let moment = 0;
    parts.forEach((p) => {
      mass += p.m;
      moment += p.m * p.x;
    });
    const cg = moment / mass;
    const margin = (cp - cg) / D;
    let flight = "good";
    if (margin < 0.35) flight = "tumble";
    else if (margin < 1) flight = "wobble";
    else if (margin > 2.6) flight = "swerve";

    return {
      noseLen: noseLen, bodyLen: bodyLen, finSize: finSize, finPos: finPos,
      payload: payload, payloadPos: payloadPos, payloadY: payloadY, fuelH: fuelH,
      nozzle: nozzle, fuel: fuel,
      chord: chord, span: span, slide: slide,
      cp: cp, cg: cg, margin: margin, flight: flight,
      total: noseLen + bodyLen
    };
  }

  const api = { analyze: analyze, chordOf: chordOf, PAYLOADS: PAYLOADS };
  root.RocketBalance = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
