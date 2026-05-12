import Image from "next/image";

export function VeloraLogo() {
  return (
    <div className="flex items-center gap-2 text-[13px] font-bold tracking-[0.16em] text-white">
      <Image
        src="/icons/velora-192.png"
        alt="Velora"
        width={22}
        height={22}
        className="h-[22px] w-[22px]"
        priority
      />
      <span>VELORA</span>
    </div>
  );
}
