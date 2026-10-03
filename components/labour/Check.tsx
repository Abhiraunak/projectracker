import { ComparisonGrid } from "./ComparisonGrid";


const sampleData = [
  {
    id: "1",
    title: "Reinforced Concrete Works",
    area: 12500,
    contractorRate: 120,
    inHouseRate: 105,
  },
  {
    id: "2",
    title: "Interior Plastering & Finish",
    area: 8500,
    contractorRate: 85,
    inHouseRate: 90,
  },
  {
    id: "3",
    title: "Timbering work",
    area:200,
    contractorRate: 120,
    inHouseRate: 130,

  },
  {
    id: "4",
    title: "Electric work",
    area:500,
    contractorRate: 150,
    inHouseRate: 90,

  },
   {
    id: "5",
    title: "Electric work",
    area:500,
    contractorRate: 150,
    inHouseRate: 90,

  }
];

export default function Check() {
  return (
    <div className="p-6">
      <ComparisonGrid 
        title="Contractor vs In-house Comparison" 
        items={sampleData} 
        currencySymbol="₹"
      />
    </div>
  );
}