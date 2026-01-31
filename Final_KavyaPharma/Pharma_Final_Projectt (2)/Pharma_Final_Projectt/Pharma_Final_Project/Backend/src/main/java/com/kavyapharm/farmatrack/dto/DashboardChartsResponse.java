package com.kavyapharm.farmatrack.dto;

import java.util.List;
import java.util.Map;

public record DashboardChartsResponse(
        List<Integer> salesByMonth,
        List<Integer> visitsByMonth,
        List<Integer> targetsByMonth,
        List<String> monthLabels,
        Map<String, Integer> expenseByCategory,
        Map<String, List<Integer>> productSalesByMonth
) {
}
