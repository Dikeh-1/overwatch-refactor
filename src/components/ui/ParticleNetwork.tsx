export default function ParticleNetwork() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[11] overflow-hidden"
    >
      <div className="particle-field absolute inset-0" />
      <div className="particle-lines absolute inset-0" />
    </div>
  );
}
