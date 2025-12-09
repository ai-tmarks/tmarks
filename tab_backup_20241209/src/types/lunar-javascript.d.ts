declare module 'lunar-javascript' {
  export class Lunar {
    static fromDate(date: Date): Lunar;
    getYearInChinese(): string;
    getYearInGanZhi(): string;
    getYearShengXiao(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getMonth(): number;
    getDay(): number;
  }

  export class Solar {
    static fromDate(date: Date): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getJieQi(): string | null;
    getNextJieQi(): JieQi | null;
  }

  export class JieQi {
    getName(): string;
    getSolar(): Solar;
  }
}

