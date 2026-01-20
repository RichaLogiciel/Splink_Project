interface ProductInsightsIconProps {
  fill?: string;
  width?: number;
  height?: number;
}

const ProductInsightsIcon = ({
  fill = "#4C4D52",
  width = 18,
  height = 18
}: ProductInsightsIconProps) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M19 19H2.6C2.03995 19 1.75992 19 1.54601 18.891C1.35785 18.7951 1.20487 18.6422 1.10899 18.454C1 18.2401 1 17.9601 1 17.4V1M19 5L13.5657 10.4343C13.3677 10.6323 13.2687 10.7313 13.1545 10.7684C13.0541 10.8011 12.9459 10.8011 12.8455 10.7684C12.7313 10.7313 12.6323 10.6323 12.4343 10.4343L10.5657 8.56569C10.3677 8.36768 10.2687 8.26867 10.1545 8.23158C10.0541 8.19895 9.94591 8.19895 9.84549 8.23158C9.73133 8.26867 9.63232 8.36768 9.43431 8.56569L5 13M19 5H15M19 5V9"
      stroke={fill}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default ProductInsightsIcon;
