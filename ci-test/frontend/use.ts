import createClient from "openapi-fetch";
import type { components, paths } from "./server/api/schema";

type Quote = components["schemas"]["Quote"];

const api = createClient<paths>({ baseUrl: "http://localhost:8080" });

export async function show(code: string): Promise<string> {
  const { data, error } = await api.GET("/api/v1/stocks/{code}", { params: { path: { code } } });
  if (error || !data) throw new Error("quote failed");
  const q: Quote = data;
  const price: string = q.price;            // BigDecimal → string
  const qty: number = q.quantity;           // 정수 → number
  const limit: string | null = q.limitPrice; // nullable → string | null (키는 항상 있음)
  return `${q.code} ${price} x${qty} ${limit ?? "-"}`;
}
