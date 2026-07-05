import { ComponentProps } from "react";
import { ResponsiveContainer as RechartsResponsiveContainer } from "recharts";

/**
 * Обёртка над recharts <ResponsiveContainer>.
 *
 * По умолчанию recharts стартует с initialDimension {width:-1,height:-1} и на
 * первый кадр (до срабатывания ResizeObserver, что усугубляется двойным
 * монтированием React StrictMode) рендерит график с отрицательным размером —
 * это и есть предупреждение "The width(-1) and height(-1) of chart should be
 * greater than 0". Задаём положительный стартовый размер, чтобы первый рендер
 * был валидным; реальный размер подхватится обсервером сразу после.
 */
export function ResponsiveContainer(
  props: ComponentProps<typeof RechartsResponsiveContainer>
) {
  return (
    <RechartsResponsiveContainer
      initialDimension={{ width: 300, height: 200 }}
      {...props}
    />
  );
}

export default ResponsiveContainer;
