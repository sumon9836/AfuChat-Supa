import React from "react";
import { View, ScrollView } from "react-native";

export function PagerView({ children, style, initialPage, onPageSelected, onPageScroll, scrollEnabled, ...rest }) {
  const pages = React.Children.toArray(children);
  const [currentPage, setCurrentPage] = React.useState(initialPage || 0);

  React.useEffect(() => {
    onPageSelected && onPageSelected({ nativeEvent: { position: currentPage } });
  }, [currentPage]);

  return (
    <View style={[{ flex: 1, overflow: "hidden" }, style]} {...rest}>
      {pages[currentPage] || null}
    </View>
  );
}

PagerView.displayName = "PagerView";
export default PagerView;
