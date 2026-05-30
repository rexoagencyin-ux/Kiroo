import { Truck, ShieldCheck, RotateCcw, Headphones } from 'lucide-react';

const features = [
  { icon: Truck, title: 'Free Shipping', desc: 'On orders over ₹999' },
  { icon: ShieldCheck, title: 'Secure Payments', desc: 'Razorpay & COD' },
  { icon: RotateCcw, title: 'Easy Returns', desc: '7-day return policy' },
  { icon: Headphones, title: '24/7 Support', desc: 'We are here to help' },
];

export function FeatureStrip() {
  return (
    <section className="container mt-10">
      <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-white p-4 md:grid-cols-4">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="flex items-center gap-3">
              <div className="rounded-full bg-primary-50 p-2.5">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-accent">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
