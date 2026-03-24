// Skeleton Loader Components

export const TableSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => {
    return (
        <div className="w-full">
            {/* Table Header Skeleton */}
            <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={`header-${i}`} className="h-4 bg-gray-200 rounded animate-pulse" />
                ))}
            </div>

            {/* Table Rows Skeleton */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div
                    key={`row-${rowIndex}`}
                    className="grid gap-4 mb-3 py-3 border-b border-gray-100"
                    style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
                >
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div
                            key={`cell-${rowIndex}-${colIndex}`}
                            className="h-4 bg-gray-100 rounded animate-pulse"
                            style={{ animationDelay: `${(rowIndex * columns + colIndex) * 50}ms` }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

export const CardSkeleton = ({ count = 1 }: { count?: number }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={`card-${index}`}
                    className="bg-white shadow-sm rounded p-6 border border-gray-100"
                    style={{ animationDelay: `${index * 100}ms` }}
                >
                    <div className="animate-pulse space-y-4">
                        {/* Title */}
                        <div className="h-4 bg-gray-200 rounded w-1/2" />

                        {/* Value */}
                        <div className="h-8 bg-gray-300 rounded w-3/4" />

                        {/* Subtitle */}
                        <div className="h-3 bg-gray-100 rounded w-2/3" />
                    </div>
                </div>
            ))}
        </>
    );
};

export const TextSkeleton = ({ lines = 3, className = '' }: { lines?: number; className?: string }) => {
    return (
        <div className={`space-y-3 ${className}`}>
            {Array.from({ length: lines }).map((_, index) => (
                <div
                    key={`line-${index}`}
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{
                        width: index === lines - 1 ? '60%' : '100%',
                        animationDelay: `${index * 100}ms`,
                    }}
                />
            ))}
        </div>
    );
};

export const ChartSkeleton = () => {
    return (
        <div className="bg-white shadow-sm rounded p-6 border border-gray-100">
            <div className="animate-pulse space-y-4">
                {/* Chart Title */}
                <div className="h-5 bg-gray-200 rounded w-1/3" />

                {/* Chart Area */}
                <div className="h-64 bg-gray-100 rounded flex items-end justify-around gap-2 p-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div
                            key={`bar-${index}`}
                            className="bg-gray-200 rounded-t w-full animate-pulse"
                            style={{
                                height: `${[50, 80, 40, 95, 60, 75][index % 6]}%`,
                                animationDelay: `${index * 100}ms`,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
