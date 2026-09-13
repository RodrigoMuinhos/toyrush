export function Fireworks() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${15 + i * 14}%`,
            top: `${15 + ((i * 17) % 55)}%`,
          }}
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a, j) => (
            <i
              key={a}
              style={{
                position: "absolute",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: ["#FFC928", "#FF8A2A", "#4ADE80", "#60A5FA"][j % 4],
                transform: `rotate(${a}deg) translateX(${60 + i * 15}px)`,
                animation: `firework-burst .9s ${i * 0.18}s ease-out both`,
              }}
            />
          ))}
        </div>
      ))}
    </>
  );
}
export default Fireworks;
