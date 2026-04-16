import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '@/lib/utils';

export type ChartConfig = {
    [key: string]: {
        label?: React.ReactNode;
        color?: string;
    };
};

type ChartContextProps = {
    config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
    const context = React.useContext(ChartContext);

    if (!context) {
        throw new Error('useChart must be used within a <ChartContainer />');
    }

    return context;
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
    const colorEntries = Object.entries(config).filter(([, value]) => value.color);

    if (!colorEntries.length) {
        return null;
    }

    return (
        <style
            dangerouslySetInnerHTML={{
                __html: `
[data-chart="${id}"] {
${colorEntries
    .map(([key, value]) => `  --color-${key}: ${value.color};`)
    .join('\n')}
}
                `,
            }}
        />
    );
}

const ChartContainer = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<'div'> & {
        config: ChartConfig;
    }
>(({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId().replace(/:/g, '');
    const chartId = id ?? `chart-${uniqueId}`;

    return (
        <ChartContext.Provider value={{ config }}>
            <div
                ref={ref}
                data-chart={chartId}
                className={cn(
                    'flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke="#ccc"]]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke="#ccc"]]:stroke-border [&_.recharts-sector]:outline-none [&_.recharts-sector[stroke="#fff"]]:stroke-transparent [&_.recharts-surface]:outline-none',
                    className,
                )}
                {...props}
            >
                <ChartStyle id={chartId} config={config} />
                <RechartsPrimitive.ResponsiveContainer>
                    {children as React.ReactElement}
                </RechartsPrimitive.ResponsiveContainer>
            </div>
        </ChartContext.Provider>
    );
});
ChartContainer.displayName = 'ChartContainer';

const ChartTooltip = RechartsPrimitive.Tooltip;

type ChartTooltipPayloadItem = {
    color?: string;
    name?: string;
    dataKey?: string | number;
    value?: number | string;
};

type ChartTooltipContentProps = {
    active?: boolean;
    payload?: ChartTooltipPayloadItem[];
    label?: React.ReactNode;
    className?: string;
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: 'line' | 'dot';
    formatter?: (
        value: number | string,
        name: string,
        item: ChartTooltipPayloadItem,
        index: number,
    ) => React.ReactNode;
};

function ChartTooltipContent({
    active,
    payload,
    label,
    className,
    hideLabel = false,
    hideIndicator = false,
    indicator = 'dot',
    formatter,
}: ChartTooltipContentProps) {
    const { config } = useChart();

    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div
            className={cn(
                'grid min-w-[180px] gap-2 rounded-xl border border-border/70 bg-background/95 px-3 py-2 text-xs shadow-xl',
                className,
            )}
        >
            {!hideLabel ? (
                <div className="font-medium text-foreground">{label}</div>
            ) : null}
            <div className="grid gap-1.5">
                {payload.map((item, index) => {
                    const key = String(item.dataKey ?? item.name ?? index);
                    const itemConfig = config[key];
                    const indicatorColor = item.color ?? itemConfig?.color ?? 'currentColor';

                    return (
                        <div
                            key={`${item.dataKey ?? item.name}-${index}`}
                            className="flex items-center justify-between gap-3"
                        >
                            <div className="flex items-center gap-2">
                                {!hideIndicator ? (
                                    indicator === 'line' ? (
                                        <span
                                            className="h-2 w-3 rounded-full"
                                            style={{ backgroundColor: indicatorColor }}
                                        />
                                    ) : (
                                        <span
                                            className="size-2 rounded-full"
                                            style={{ backgroundColor: indicatorColor }}
                                        />
                                    )
                                ) : null}
                                <span className="text-muted-foreground">
                                    {itemConfig?.label ?? item.name}
                                </span>
                            </div>
                            <span className="font-medium text-foreground">
                                {formatter
                                    ? formatter(item.value ?? 0, String(item.name), item, index)
                                    : item.value}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

type ChartLegendContentProps = React.ComponentProps<'div'> &
    {
        payload?: Array<{
            value?: string;
            dataKey?: string | number;
            color?: string;
        }>;
        verticalAlign?: 'top' | 'bottom' | 'middle';
    };

function ChartLegendContent({
    className,
    payload,
    verticalAlign = 'bottom',
}: ChartLegendContentProps) {
    const { config } = useChart();

    if (!payload?.length) {
        return null;
    }

    return (
        <div
            className={cn(
                'flex items-center justify-center gap-4',
                verticalAlign === 'top' ? 'pb-3' : 'pt-3',
                className,
            )}
        >
            {payload.map((item) => {
                const key = String(item.dataKey ?? item.value ?? '');
                const itemConfig = config[key];

                return (
                    <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: item.color ?? itemConfig?.color }}
                        />
                        <span>{itemConfig?.label ?? item.value}</span>
                    </div>
                );
            })}
        </div>
    );
}

const ChartLegend = RechartsPrimitive.Legend;

export {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
};
