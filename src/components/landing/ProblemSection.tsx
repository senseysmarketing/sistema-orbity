import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, UserX, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const metrics = [
  {
    icon: Clock,
    value: "15h",
    description: "desperdiçadas por semana em tarefas manuais",
  },
  {
    icon: UserX,
    value: "40%",
    description: "dos leads perdidos por falta de follow-up",
  },
  {
    icon: RefreshCw,
    value: "3x",
    description: "mais retrabalho sem sistema centralizado",
  },
];

export function ProblemSection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-slate-50/50">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-slate-900">
            O caos invisível que devora o lucro da sua agência.
          </h2>
          <p className="text-lg md:text-xl text-slate-500 max-w-3xl mx-auto">
            Enquanto sua equipe luta contra o caos, oportunidades escapam silenciosamente.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {metrics.map((metric, index) => (
            <motion.div
              key={index}
              className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 p-8 text-center"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
                <metric.icon className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-3">
                {metric.value}
              </p>
              <p className="text-sm text-slate-500 leading-relaxed">
                {metric.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Button
            size="lg"
            className="bg-[#1c102f] hover:bg-[#1c102f]/90 text-white"
            onClick={() => navigate("/onboarding")}
          >
            Resolva Esses Problemas Agora
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
