package com.kavyapharm.farmatrack.dto;

import java.util.List;
import java.util.Map;

public record DashboardChartsResponse(
                List<Double> salesByMonth,
                List<Long> visitsByMonth,
                List<Double> targetsByMonth,
                List<String> monthLabels,
                Map<String, Double> expenseByCategory,
                Map<String, List<Double>> productSalesByMonth) {
}
