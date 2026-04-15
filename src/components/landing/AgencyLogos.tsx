export function AgencyLogos() {
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-sm font-medium text-white/60">Impulso Digital</span>
      </div>

      <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-sm font-medium text-white/60">Rocket Agency</span>
      </div>

      <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-sm font-medium text-white/60">DigitalFlow</span>
      </div>

      <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-700 to-purple-900 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-sm font-medium text-white/60">Marketing Pro</span>
      </div>

      <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-violet-800 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M2 12h20" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="4"/>
          </svg>
        </div>
        <span className="text-sm font-medium text-white/60">Growth Labs</span>
      </div>
    </div>
  );
}
