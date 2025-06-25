import { Category } from "@shared/schema";

type CategoryCardProps = {
  category: Category;
};

export default function CategoryCard({ category }: CategoryCardProps) {
  const handleClick = () => {
    window.location.href = `/category/${encodeURIComponent(category.name.toLowerCase())}`;
  };

  return (
    <div 
      className="bg-secondary-bg p-4 rounded-lg text-center hover:bg-primary-light transition cursor-pointer"
      onClick={handleClick}
    >
      <div className="bg-primary-light w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
        <i className={`${category.icon} text-2xl text-accent`}></i>
      </div>
      <h3 className="font-medium">{category.name}</h3>
    </div>
  );
}
