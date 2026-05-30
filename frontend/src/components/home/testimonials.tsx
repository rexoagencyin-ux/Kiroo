import { Star, Quote } from 'lucide-react';

const reviews = [
  { name: 'Aarav S.', text: 'The smartwatch quality blew me away. Fast delivery and great packaging!', rating: 5 },
  { name: 'Priya M.', text: 'Earbuds sound amazing for the price. Customer support was super helpful.', rating: 5 },
  { name: 'Rohan K.', text: 'Ordered a projector for movie nights — works perfectly. Highly recommend.', rating: 4 },
  { name: 'Sneha R.', text: 'Love the COD option and the easy returns. My go-to tech store now.', rating: 5 },
];

export function Testimonials() {
  return (
    <section className="container mt-12">
      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold text-accent md:text-2xl">What our customers say</h2>
        <p className="text-sm text-muted-foreground">Trusted by thousands of happy shoppers</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reviews.map((r) => (
          <div key={r.name} className="rounded-xl border bg-white p-5">
            <Quote className="h-6 w-6 text-primary/40" />
            <div className="mt-2 flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={i < r.rating ? 'h-4 w-4 fill-amber-400 text-amber-400' : 'h-4 w-4 text-muted'} />
              ))}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
            <p className="mt-3 text-sm font-semibold text-accent">{r.name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
