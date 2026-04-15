import { Badge } from "@/components/ui/badge";

export function DemoSection() {
  return (
    <section className="pt-20 pb-0 px-4 bg-slate-50">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-slate-200/60 text-slate-600 border-slate-300/50 hover:bg-slate-200">
            Conheça o Sistema
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
            Veja o Sistema{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1c102f] to-purple-600">
              por Dentro
            </span>
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Navegue pelas principais funcionalidades e descubra como a Orbity
            pode transformar a gestão da sua agência.
          </p>
        </div>

        {/* Video Showcase */}
        <div className="relative group w-full max-w-5xl mx-auto">
          {/* Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/15 to-indigo-600/15 rounded-[2.5rem] blur-2xl -z-10 opacity-40 group-hover:opacity-70 transition-opacity duration-500" />

          {/* Container */}
          <div className="w-full aspect-video rounded-[2rem] overflow-hidden border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.1),0_10px_15px_rgba(0,0,0,0.05)] transition-transform duration-700 ease-out hover:scale-[1.01] bg-slate-100">
            <img
              src="/placeholder.svg"
              alt="Demonstração Orbity"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
