import EstimateForm from "@/app/components/EstimateForm";

export default function HomePage() {
  return (
    <main>
      <section className="card" style={{ marginBottom: 18 }}>
        <h1>Steelhead Quick Estimate</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          Fence, Deck, Pergola, and Repair/Handyman ballpark pricing with transparent material and labor line items.
        </p>
      </section>
      <EstimateForm />
    </main>
  );
}
