import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    public_read: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<750"],
  },
};

const base = __ENV.BASE_URL || "http://127.0.0.1:3000";

export default function () {
  for (const path of ["/", "/etapas", "/embarcacoes", "/classificacoes", "/api/health"]) {
    const response = http.get(`${base}${path}`);
    check(response, { [`${path} status`]: (r) => r.status === 200 });
  }
  sleep(1);
}
