import type { Vendor } from "@/lib/materials/types";

/** Vendor name, with the contact person and a tap-to-call phone number */
export function VendorCell({ vendor }: { vendor: Vendor | null }) {
  if (!vendor) return <span className="text-stone-400">No vendor yet</span>;
  return (
    <div>
      <p className="font-medium">{vendor.name}</p>
      <a href={`tel:${vendor.phone}`} className="text-xs text-stone-500 underline-offset-2 hover:underline">
        {vendor.contactPerson}, {vendor.phone}
      </a>
    </div>
  );
}
